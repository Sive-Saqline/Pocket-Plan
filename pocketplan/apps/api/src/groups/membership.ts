// Membership rules (PRD v4 §6.11), kept free of the database so they can be
// tested directly. The service loads the facts, these decide.

import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import type { Paisa } from '../balances/settlement';

export type GroupRole = 'OWNER' | 'MEMBER';

export interface MemberFact {
  userId: string;
  name: string;
  role: GroupRole;
  /** false once they have left or been removed */
  active: boolean;
}

const taka = (p: Paisa) =>
  `৳${(Math.abs(p) / 100).toLocaleString('en-US', {
    minimumFractionDigits: p % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;

function activeMember(members: MemberFact[], userId: string) {
  return members.find((m) => m.userId === userId && m.active);
}

/** The caller as an active member, or 404 (non-members can't tell the group exists). */
export function requireMember(members: MemberFact[], userId: string) {
  const me = activeMember(members, userId);
  if (!me) throw new NotFoundException('Group not found');
  return me;
}

export function requireOwner(
  members: MemberFact[],
  userId: string,
  action: string,
) {
  const me = requireMember(members, userId);
  if (me.role !== 'OWNER') {
    throw new ForbiddenException(`Only group owners can ${action}`);
  }
  return me;
}

const ownerCount = (members: MemberFact[]) =>
  members.filter((m) => m.active && m.role === 'OWNER').length;

/** Owners change roles; a group always keeps at least one owner. */
export function assertCanChangeRole(
  members: MemberFact[],
  actorId: string,
  targetId: string,
  role: GroupRole,
) {
  requireOwner(members, actorId, 'change roles');
  const target = activeMember(members, targetId);
  if (!target) throw new NotFoundException('Member not found');
  if (
    target.role === 'OWNER' &&
    role === 'MEMBER' &&
    ownerCount(members) === 1
  ) {
    throw new ConflictException(
      'A group needs at least one owner. Make someone else an owner first.',
    );
  }
  return target;
}

/**
 * Leaving (actor = target) or removing someone (owners only, members only).
 * Only people who are settled up (balance ৳0) can go, so nobody walks away
 * owing money or being owed it; their past expenses stay in the history.
 */
export function assertCanRemove(
  members: MemberFact[],
  actorId: string,
  targetId: string,
  balanceOf: (userId: string) => Paisa,
) {
  const self = actorId === targetId;
  const actor = requireMember(members, actorId);
  const target = activeMember(members, targetId);
  if (!target) throw new NotFoundException('Member not found');

  if (!self) {
    if (actor.role !== 'OWNER') {
      throw new ForbiddenException('Only group owners can remove people');
    }
    if (target.role === 'OWNER') {
      throw new ConflictException(
        `${target.name} is an owner. Make them a member first, then remove them.`,
      );
    }
  } else if (
    target.role === 'OWNER' &&
    ownerCount(members) === 1 &&
    members.some((m) => m.active && m.userId !== targetId)
  ) {
    throw new ConflictException(
      "You're the only owner. Make someone else an owner before you leave.",
    );
  }

  const balance = balanceOf(targetId);
  if (balance !== 0) {
    const who = self ? 'You' : target.name;
    throw new ConflictException(
      balance < 0
        ? `${who} still ${self ? 'owe' : 'owes'} ${taka(balance)} in this group. Settle up first.`
        : `${who} ${self ? 'are' : 'is'} still owed ${taka(balance)} in this group. Settle up first.`,
    );
  }
  return target;
}
