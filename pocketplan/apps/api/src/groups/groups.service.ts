import {
  ConflictException,
  GoneException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGroupDto, CreateInviteDto, UpdateGroupDto } from './groups.dto';
import {
  loadLedger,
  loadMembers,
  lockGroup,
  Member,
  TX_OPTIONS,
} from './group-data';
import { InviteMailer } from './invite-mailer';
import {
  assertCanChangeRole,
  assertCanRemove,
  GroupRole,
  requireMember,
  requireOwner,
} from './membership';

const INVITE_DAYS = 7;
const hashToken = (token: string) =>
  createHash('sha256').update(token).digest('hex');

type Delivery = 'email' | 'in_app' | 'link';

/** Groups, members and invitations (PRD v4 §6.10-6.11, §12). */
@Injectable()
export class GroupsService {
  private readonly webOrigin: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailer: InviteMailer,
    config: ConfigService,
  ) {
    this.webOrigin = (
      config.get<string>('WEB_ORIGIN') ?? 'http://localhost:3000'
    ).replace(/\/+$/, '');
  }

  // --- groups ----------------------------------------------------------------

  /** My groups, with my balance in each (+ = I'm owed, − = I owe). */
  async list(userId: string) {
    const rows = await this.prisma.$queryRaw<
      {
        id: string;
        name: string;
        role: GroupRole;
        monthly_budget: number | null;
        member_count: number;
        balance: number;
      }[]
    >`
      SELECT g.id, g.name, m.role, g.monthly_budget::float8 AS monthly_budget,
        (SELECT count(*)::int FROM group_members x
          WHERE x.group_id = g.id AND x.left_at IS NULL) AS member_count,
        (
          coalesce((SELECT sum(e.amount) FROM expenses e
                     WHERE e.group_id = g.id AND e.paid_by = m.user_id), 0)
          - coalesce((SELECT sum(p.share_amount) FROM expense_participants p
                       JOIN expenses e ON e.id = p.expense_id
                      WHERE e.group_id = g.id AND p.user_id = m.user_id), 0)
          + coalesce((SELECT sum(s.amount) FROM settlements s
                       WHERE s.group_id = g.id AND s.from_user_id = m.user_id), 0)
          - coalesce((SELECT sum(s.amount) FROM settlements s
                       WHERE s.group_id = g.id AND s.to_user_id = m.user_id), 0)
        )::float8 AS balance
      FROM group_members m
      JOIN groups g ON g.id = m.group_id
      WHERE m.user_id = ${userId}::uuid AND m.left_at IS NULL
      ORDER BY g.created_at DESC, g.id`;
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      myRole: r.role,
      monthlyBudget: r.monthly_budget,
      memberCount: r.member_count,
      myBalance: r.balance,
    }));
  }

  /** Just the id and name of each group I'm in (no balances: one cheap query). */
  async names(userId: string): Promise<{ id: string; name: string }[]> {
    return this.prisma.$queryRaw`
      SELECT g.id, g.name FROM group_members m
      JOIN groups g ON g.id = m.group_id
      WHERE m.user_id = ${userId}::uuid AND m.left_at IS NULL
      ORDER BY g.created_at DESC, g.id`;
  }

  async create(userId: string, { name }: CreateGroupDto) {
    const group = await this.prisma.$transaction(
      (tx) =>
        tx.group.create({
          data: {
            name,
            createdBy: userId,
            members: { create: { userId, role: 'OWNER' } },
          },
        }),
      TX_OPTIONS,
    );
    return this.get(userId, group.id);
  }

  async get(userId: string, groupId: string) {
    const [group, members] = await Promise.all([
      this.prisma.group.findUnique({ where: { id: groupId } }),
      loadMembers(this.prisma, groupId),
    ]);
    const me = requireMember(members, userId);
    if (!group) throw new NotFoundException('Group not found');
    return {
      id: group.id,
      name: group.name,
      monthlyBudget: group.monthlyBudget?.toNumber() ?? null,
      createdAt: group.createdAt.toISOString(),
      myRole: me.role,
      members: members.map(memberView),
    };
  }

  async update(userId: string, groupId: string, dto: UpdateGroupDto) {
    await this.prisma.$transaction(async (tx) => {
      await lockGroup(tx, groupId);
      requireOwner(await loadMembers(tx, groupId), userId, 'change the group');
      await tx.group.update({
        where: { id: groupId },
        data: {
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.monthlyBudget !== undefined && {
            monthlyBudget: dto.monthlyBudget,
          }),
        },
      });
    }, TX_OPTIONS);
    return this.get(userId, groupId);
  }

  /**
   * Only a group with no expenses or settlements can be deleted, so shared
   * history is never lost. Groups with history: members leave once settled.
   */
  async remove(userId: string, groupId: string) {
    await this.prisma.$transaction(async (tx) => {
      await lockGroup(tx, groupId);
      requireOwner(await loadMembers(tx, groupId), userId, 'delete the group');
      const [expenses, settlements] = await Promise.all([
        tx.expense.count({ where: { groupId } }),
        tx.settlement.count({ where: { groupId } }),
      ]);
      if (expenses + settlements > 0) {
        throw new ConflictException(
          'This group has expense history, so it is kept. Members can leave once they are settled up.',
        );
      }
      await tx.group.delete({ where: { id: groupId } });
    }, TX_OPTIONS);
  }

  // --- members ---------------------------------------------------------------

  async changeRole(
    userId: string,
    groupId: string,
    targetId: string,
    role: GroupRole,
  ) {
    await this.prisma.$transaction(async (tx) => {
      await lockGroup(tx, groupId);
      const members = await loadMembers(tx, groupId);
      assertCanChangeRole(members, userId, targetId, role);
      await tx.groupMember.update({
        where: { groupId_userId: { groupId, userId: targetId } },
        data: { role },
      });
    }, TX_OPTIONS);
    return this.get(userId, groupId);
  }

  /** Leave (targetId = me) or remove someone. The membership row is kept for history. */
  async removeMember(userId: string, groupId: string, targetId: string) {
    await this.prisma.$transaction(async (tx) => {
      await lockGroup(tx, groupId);
      const ledger = await loadLedger(tx, groupId);
      assertCanRemove(
        ledger.members,
        userId,
        targetId,
        (id) => ledger.balances.get(id) ?? 0,
      );
      await tx.groupMember.update({
        where: { groupId_userId: { groupId, userId: targetId } },
        data: { leftAt: new Date() },
      });
    }, TX_OPTIONS);
  }

  // --- invites (owner side) --------------------------------------------------

  async invite(userId: string, groupId: string, dto: CreateInviteDto) {
    const token = randomBytes(32).toString('base64url');
    const link = `${this.webOrigin}/invite/${token}`;
    const role = dto.role ?? 'MEMBER';
    const email = dto.email ?? null;

    const { invite, existingUser } = await this.prisma.$transaction(
      async (tx) => {
        await lockGroup(tx, groupId);
        const members = await loadMembers(tx, groupId);
        requireOwner(members, userId, 'invite people');
        let existingUser = false;
        if (email) {
          const user = await tx.user.findUnique({ where: { email } });
          existingUser = !!user;
          const member = members.find((m) => m.email === email && m.active);
          if (member) {
            throw new ConflictException(
              `${member.name} is already in this group`,
            );
          }
        }
        // One live invite per email, and one live link, per group: making a
        // new one replaces the old (e.g. "send again" or a leaked link).
        await tx.groupInvite.updateMany({
          where: {
            groupId,
            email,
            acceptedAt: null,
            revokedAt: null,
          },
          data: { revokedAt: new Date() },
        });
        const invite = await tx.groupInvite.create({
          data: {
            groupId,
            email,
            role,
            tokenHash: hashToken(token),
            invitedBy: userId,
            expiresAt: new Date(Date.now() + INVITE_DAYS * 86_400_000),
          },
        });
        return { invite, existingUser };
      },
      TX_OPTIONS,
    );

    let delivery: Delivery = 'link';
    let warning: string | null = null;
    if (email && existingUser) {
      delivery = 'in_app';
    } else if (email) {
      const result = await this.mailer.inviteNewUser(
        email,
        `${this.webOrigin}/auth/accept-invite?next=${encodeURIComponent(`/invite/${token}`)}`,
      );
      const reason = 'reason' in result ? result.reason : null;
      if (!reason) {
        delivery = 'email';
      } else if (reason === 'already_registered') {
        // Signed up a moment ago: they'll see it in the app.
        delivery = 'in_app';
      } else {
        warning =
          reason === 'rate_limited'
            ? "The invite email couldn't be sent right now (email limit reached). Send them the link instead."
            : "The invite email couldn't be sent. Send them the link instead.";
      }
    }
    return { invite: inviteView(invite), link, delivery, warning };
  }

  /** Pending invites (owners only). Links can't be shown again: only their hash is kept. */
  async invites(userId: string, groupId: string) {
    requireOwner(
      await loadMembers(this.prisma, groupId),
      userId,
      'see invites',
    );
    const rows = await this.prisma.groupInvite.findMany({
      where: {
        groupId,
        acceptedAt: null,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(inviteView);
  }

  async revokeInvite(userId: string, groupId: string, inviteId: string) {
    requireOwner(
      await loadMembers(this.prisma, groupId),
      userId,
      'cancel invites',
    );
    const { count } = await this.prisma.groupInvite.updateMany({
      where: { id: inviteId, groupId, acceptedAt: null, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (count === 0) throw new NotFoundException('Invite not found');
  }

  // --- invites (invited person's side) ---------------------------------------

  /** Email invites waiting for me (shown in the app, PRD: Supabase can't email existing users). */
  async received(userId: string) {
    const me = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    const rows = await this.prisma.groupInvite.findMany({
      where: {
        email: me.email,
        acceptedAt: null,
        revokedAt: null,
        expiresAt: { gt: new Date() },
        group: { members: { none: { userId, leftAt: null } } },
      },
      include: {
        group: {
          select: {
            name: true,
            _count: { select: { members: { where: { leftAt: null } } } },
          },
        },
        inviter: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => ({
      id: r.id,
      groupId: r.groupId,
      groupName: r.group.name,
      memberCount: r.group._count.members,
      invitedBy: r.inviter.name,
      role: r.role,
      expiresAt: r.expiresAt.toISOString(),
    }));
  }

  async acceptReceived(userId: string, inviteId: string) {
    return this.prisma.$transaction(async (tx) => {
      const me = await tx.user.findUniqueOrThrow({ where: { id: userId } });
      const invite = await tx.groupInvite.findFirst({
        where: { id: inviteId, email: me.email },
      });
      if (!invite) throw new NotFoundException('Invite not found');
      return this.join(tx, invite, userId);
    }, TX_OPTIONS);
  }

  async declineReceived(userId: string, inviteId: string) {
    const me = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    const { count } = await this.prisma.groupInvite.updateMany({
      where: {
        id: inviteId,
        email: me.email,
        acceptedAt: null,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });
    if (count === 0) throw new NotFoundException('Invite not found');
  }

  /** What an invite link is for, before accepting it. */
  async preview(userId: string, token: string) {
    const invite = await this.prisma.groupInvite.findUnique({
      where: { tokenHash: hashToken(token) },
      include: {
        group: {
          select: {
            id: true,
            name: true,
            members: { where: { leftAt: null }, select: { userId: true } },
          },
        },
        inviter: { select: { name: true } },
      },
    });
    if (!invite) throw new NotFoundException("This invite link isn't valid");
    const me = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    return {
      groupId: invite.group.id,
      groupName: invite.group.name,
      memberCount: invite.group.members.length,
      invitedBy: invite.inviter.name,
      role: invite.role,
      expiresAt: invite.expiresAt.toISOString(),
      status: inviteStatus(
        invite,
        me.email,
        invite.group.members.some((m) => m.userId === userId),
      ),
      /** Only for an email invite meant for someone else, so they know which account to use. */
      invitedEmail:
        invite.email && invite.email !== me.email
          ? maskEmail(invite.email)
          : null,
    };
  }

  async accept(userId: string, token: string) {
    return this.prisma.$transaction(async (tx) => {
      const invite = await tx.groupInvite.findUnique({
        where: { tokenHash: hashToken(token) },
      });
      if (!invite) throw new NotFoundException("This invite link isn't valid");
      return this.join(tx, invite, userId);
    }, TX_OPTIONS);
  }

  private async join(
    tx: Prisma.TransactionClient,
    invite: Prisma.GroupInviteGetPayload<object>,
    userId: string,
  ) {
    await lockGroup(tx, invite.groupId);
    const me = await tx.user.findUniqueOrThrow({ where: { id: userId } });
    const existing = await tx.groupMember.findUnique({
      where: { groupId_userId: { groupId: invite.groupId, userId } },
    });
    const status = inviteStatus(invite, me.email, existing?.leftAt === null);
    if (status === 'already_member') return { groupId: invite.groupId };
    if (status === 'wrong_account') {
      throw new ConflictException(
        `This invite was sent to ${maskEmail(invite.email!)}. Sign in with that account to accept it.`,
      );
    }
    if (status !== 'valid') {
      throw new GoneException(
        status === 'expired'
          ? 'This invite has expired. Ask for a new one.'
          : status === 'used'
            ? 'This invite has already been used.'
            : 'This invite was cancelled. Ask for a new one.',
      );
    }

    if (existing) {
      // Rejoining: same row, so their earlier expenses stay theirs.
      await tx.groupMember.update({
        where: { id: existing.id },
        data: { leftAt: null, role: invite.role, joinedAt: new Date() },
      });
    } else {
      await tx.groupMember.create({
        data: { groupId: invite.groupId, userId, role: invite.role },
      });
    }
    // Email invites are single use; a shareable link stays usable until it
    // expires or an owner replaces it.
    if (invite.email) {
      await tx.groupInvite.update({
        where: { id: invite.id },
        data: { acceptedBy: userId, acceptedAt: new Date() },
      });
    }
    return { groupId: invite.groupId };
  }
}

type InviteStatus =
  'valid' | 'already_member' | 'wrong_account' | 'expired' | 'used' | 'revoked';

function inviteStatus(
  invite: Prisma.GroupInviteGetPayload<object>,
  myEmail: string,
  isActiveMember: boolean,
): InviteStatus {
  if (isActiveMember) return 'already_member';
  if (invite.revokedAt) return 'revoked';
  if (invite.acceptedAt) return 'used';
  if (invite.expiresAt <= new Date()) return 'expired';
  if (invite.email && invite.email !== myEmail.toLowerCase()) {
    return 'wrong_account';
  }
  return 'valid';
}

/** "nusrat@example.com" -> "nu•••@example.com" */
function maskEmail(email: string) {
  const [local, domain] = email.split('@');
  return `${local.slice(0, 2)}•••@${domain}`;
}

function memberView(m: Member) {
  return {
    userId: m.userId,
    name: m.name,
    email: m.email,
    avatarUrl: m.avatarUrl,
    role: m.role,
    active: m.active,
    joinedAt: m.joinedAt.toISOString(),
    leftAt: m.leftAt?.toISOString() ?? null,
  };
}

function inviteView(i: Prisma.GroupInviteGetPayload<object>) {
  return {
    id: i.id,
    kind: i.email ? ('email' as const) : ('link' as const),
    email: i.email,
    role: i.role,
    createdAt: i.createdAt.toISOString(),
    expiresAt: i.expiresAt.toISOString(),
  };
}
