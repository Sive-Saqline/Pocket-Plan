// Loading group data through Prisma, shared by the group services.

import { NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  computeBalances,
  Paisa,
  simplifyDebts,
  toPaisa,
} from '../balances/settlement';
import type { PrismaService } from '../prisma/prisma.service';
import type { MemberFact } from './membership';

export type Db = PrismaService | Prisma.TransactionClient;

/** Remote database: allow for a slow network, but don't hang forever. */
export const TX_OPTIONS = { maxWait: 15_000, timeout: 30_000 };

export const paisa = (d: Prisma.Decimal | number) =>
  toPaisa(typeof d === 'number' ? d : d.toNumber());
export const taka = (p: Paisa) => p / 100;
export const isoDay = (d: Date) => d.toISOString().slice(0, 10);
export const dayDate = (s: string) => new Date(`${s}T00:00:00.000Z`);

/** First day of `month` (YYYY-MM) and of the month after, as UTC dates. */
export function monthRange(month: string) {
  const [y, m] = month.split('-').map(Number);
  return {
    from: new Date(Date.UTC(y, m - 1, 1)),
    to: new Date(Date.UTC(y, m, 1)),
  };
}

export interface Member extends MemberFact {
  email: string;
  avatarUrl: string | null;
  joinedAt: Date;
  leftAt: Date | null;
}

/**
 * Locks the group's row until the transaction ends, so changes to one group
 * (expenses, settlements, membership) run one at a time and every rule is
 * checked against up-to-date data. 404 if the group doesn't exist.
 */
export async function lockGroup(tx: Prisma.TransactionClient, groupId: string) {
  const rows = await tx.$queryRaw<{ id: string }[]>`
    SELECT id FROM groups WHERE id = ${groupId}::uuid FOR UPDATE`;
  if (rows.length === 0) throw new NotFoundException('Group not found');
}

/** Everyone who has ever been in the group, oldest first (people who left included). */
export async function loadMembers(db: Db, groupId: string): Promise<Member[]> {
  const rows = await db.groupMember.findMany({
    where: { groupId },
    include: { user: { select: { name: true, email: true, avatarUrl: true } } },
    orderBy: [{ joinedAt: 'asc' }, { id: 'asc' }],
  });
  return rows.map((r) => ({
    userId: r.userId,
    name: r.user.name,
    email: r.user.email,
    avatarUrl: r.user.avatarUrl,
    role: r.role,
    active: r.leftAt === null,
    joinedAt: r.joinedAt,
    leftAt: r.leftAt,
  }));
}

export const groupExpenseInclude = {
  participants: { orderBy: { id: 'asc' } },
} satisfies Prisma.ExpenseInclude;

export type GroupExpenseRow = Prisma.ExpenseGetPayload<{
  include: typeof groupExpenseInclude;
}>;

export interface GroupLedger {
  members: Member[];
  expenses: GroupExpenseRow[];
  settlements: Prisma.SettlementGetPayload<object>[];
  /** Net balance per member in paisa (+ = is owed, − = owes). */
  balances: Map<string, Paisa>;
}

/**
 * The whole group: members, every expense with its shares, every settlement,
 * and the balances computed fresh from them (PRD §9: never stored).
 */
export async function loadLedger(
  db: Db,
  groupId: string,
): Promise<GroupLedger> {
  const [members, expenses, settlements] = await Promise.all([
    loadMembers(db, groupId),
    db.expense.findMany({
      where: { groupId },
      include: groupExpenseInclude,
      orderBy: [{ expenseDate: 'desc' }, { createdAt: 'desc' }],
    }),
    db.settlement.findMany({
      where: { groupId },
      orderBy: { settledAt: 'desc' },
    }),
  ]);
  const balances = computeBalances(
    members.map((m) => m.userId),
    expenses.map((e) => ({
      amount: paisa(e.amount),
      paidBy: e.paidBy!,
      shares: e.participants.map((p) => ({
        userId: p.userId,
        amount: paisa(p.shareAmount),
      })),
    })),
    settlements.map((s) => ({
      from: s.fromUserId,
      to: s.toUserId,
      amount: paisa(s.amount),
    })),
  );
  return { members, expenses, settlements, balances };
}

export function balanceView(ledger: GroupLedger) {
  const nameOf = (id: string) =>
    ledger.members.find((m) => m.userId === id)?.name ?? 'Former member';
  const paid = new Map<string, Paisa>();
  const share = new Map<string, Paisa>();
  for (const e of ledger.expenses) {
    paid.set(e.paidBy!, (paid.get(e.paidBy!) ?? 0) + paisa(e.amount));
    for (const p of e.participants) {
      share.set(p.userId, (share.get(p.userId) ?? 0) + paisa(p.shareAmount));
    }
  }
  return {
    members: ledger.members
      // people who left are always settled; list them only if that ever changes
      .filter((m) => m.active || ledger.balances.get(m.userId) !== 0)
      .map((m) => ({
        userId: m.userId,
        name: m.name,
        avatarUrl: m.avatarUrl,
        active: m.active,
        paid: taka(paid.get(m.userId) ?? 0),
        share: taka(share.get(m.userId) ?? 0),
        balance: taka(ledger.balances.get(m.userId) ?? 0),
      })),
    payments: simplifyDebts(ledger.balances).map((p) => ({
      from: p.from,
      fromName: nameOf(p.from),
      to: p.to,
      toName: nameOf(p.to),
      amount: taka(p.amount),
    })),
    settlements: ledger.settlements.map((s) => ({
      id: s.id,
      from: s.fromUserId,
      fromName: nameOf(s.fromUserId),
      to: s.toUserId,
      toName: nameOf(s.toUserId),
      amount: taka(paisa(s.amount)),
      settledAt: s.settledAt.toISOString(),
    })),
  };
}

export function expenseView(
  e: GroupExpenseRow,
  me: string,
  myRole: MemberFact['role'],
) {
  return {
    id: e.id,
    amount: taka(paisa(e.amount)),
    description: e.description,
    expenseDate: isoDay(e.expenseDate),
    category: e.groupCategory!,
    splitType: e.splitType!,
    paidBy: e.paidBy!,
    recordedBy: e.userId,
    participants: e.participants.map((p) => ({
      userId: p.userId,
      amount: taka(paisa(p.shareAmount)),
      value: p.shareValue === null ? null : p.shareValue.toNumber(),
    })),
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
    canEdit: e.userId === me || e.paidBy === me,
    canDelete: e.userId === me || e.paidBy === me || myRole === 'OWNER',
  };
}
