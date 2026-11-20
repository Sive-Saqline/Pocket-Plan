import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { LedgerError, Paisa, toPaisa } from '../balances/settlement';
import { computeSplit } from '../balances/split';
import { budgetStatus } from '../ledger/budgets';
import { CATEGORY_ICONS } from '../ledger/ledger.types';
import {
  addDays,
  assertDateRange,
  changePercent,
  fullMonthsOf,
  previousOf,
  rangeFields,
  trendOf,
  type ReportRange,
} from '../ledger/reports';
import { PrismaService } from '../prisma/prisma.service';
import { GroupExpenseDto, SettlementDto } from './groups.dto';
import {
  balanceView,
  dayDate,
  expenseView,
  groupExpenseInclude,
  GroupExpenseRow,
  isoDay,
  loadLedger,
  loadMembers,
  lockGroup,
  Member,
  monthRange,
  paisa,
  taka,
  TX_OPTIONS,
} from './group-data';
import { requireMember } from './membership';

const sum = (values: Paisa[]) => values.reduce((s, v) => s + v, 0);

/** Shared expenses, balances and settlements (PRD v4 §6.12-6.13, §9). */
@Injectable()
export class GroupExpensesService {
  constructor(private readonly prisma: PrismaService) {}

  // --- expenses --------------------------------------------------------------

  async list(userId: string, groupId: string, month?: string) {
    const members = await loadMembers(this.prisma, groupId);
    const me = requireMember(members, userId);
    const range = month ? monthRange(month) : null;
    const rows = await this.prisma.expense.findMany({
      where: {
        groupId,
        ...(range && { expenseDate: { gte: range.from, lt: range.to } }),
      },
      include: groupExpenseInclude,
      orderBy: [{ expenseDate: 'desc' }, { createdAt: 'desc' }],
    });
    return rows.map((e) => expenseView(e, userId, me.role));
  }

  async create(userId: string, groupId: string, dto: GroupExpenseDto) {
    const row = await this.prisma.$transaction(async (tx) => {
      await lockGroup(tx, groupId);
      const members = await loadMembers(tx, groupId);
      requireMember(members, userId);
      const shares = this.shares(members, dto);
      // One transaction: the expense and its shares are saved together or not
      // at all (and the database re-checks that the shares add up).
      return tx.expense.create({
        data: {
          ...expenseFields(dto),
          userId,
          groupId,
          participants: { create: shares },
        },
        include: groupExpenseInclude,
      });
    }, TX_OPTIONS);
    const role = await this.roleOf(userId, groupId);
    return expenseView(row, userId, role);
  }

  async update(
    userId: string,
    groupId: string,
    expenseId: string,
    dto: GroupExpenseDto,
  ) {
    const row = await this.prisma.$transaction(async (tx) => {
      await lockGroup(tx, groupId);
      const members = await loadMembers(tx, groupId);
      requireMember(members, userId);
      const current = await findExpense(tx, groupId, expenseId);
      if (current.userId !== userId && current.paidBy !== userId) {
        throw new ForbiddenException(
          'Only the person who added or paid for this expense can change it',
        );
      }
      assertEveryoneStillHere(members, current, 'changed');
      const shares = this.shares(members, dto);
      await tx.expenseParticipant.deleteMany({ where: { expenseId } });
      return tx.expense.update({
        where: { id: expenseId },
        data: { ...expenseFields(dto), participants: { create: shares } },
        include: groupExpenseInclude,
      });
    }, TX_OPTIONS);
    const role = await this.roleOf(userId, groupId);
    return expenseView(row, userId, role);
  }

  async remove(userId: string, groupId: string, expenseId: string) {
    await this.prisma.$transaction(async (tx) => {
      await lockGroup(tx, groupId);
      const members = await loadMembers(tx, groupId);
      const me = requireMember(members, userId);
      const current = await findExpense(tx, groupId, expenseId);
      if (
        current.userId !== userId &&
        current.paidBy !== userId &&
        me.role !== 'OWNER'
      ) {
        throw new ForbiddenException(
          'Only the person who added or paid for this expense, or a group owner, can delete it',
        );
      }
      assertEveryoneStillHere(members, current, 'deleted');
      await tx.expense.delete({ where: { id: expenseId } });
    }, TX_OPTIONS);
  }

  /** Validates the payer and people, then computes each share (whole paisa). */
  private shares(members: Member[], dto: GroupExpenseDto) {
    const isActive = (id: string) =>
      members.some((m) => m.userId === id && m.active);
    if (!isActive(dto.paidBy)) {
      throw new BadRequestException('Whoever paid must be in the group');
    }
    const outsider = dto.participants.find((p) => !isActive(p.userId));
    if (outsider) {
      throw new BadRequestException(
        'Everyone in the split must be in the group',
      );
    }
    try {
      return computeSplit(
        toPaisa(dto.amount),
        dto.splitType,
        dto.participants,
      ).map((s) => ({
        userId: s.userId,
        shareAmount: taka(s.amount),
        shareValue: s.value,
      }));
    } catch (err) {
      if (err instanceof LedgerError)
        throw new BadRequestException(err.message);
      throw err;
    }
  }

  private async roleOf(userId: string, groupId: string) {
    const m = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    return m?.role ?? 'MEMBER';
  }

  // --- balances & settlements -----------------------------------------------

  async balances(userId: string, groupId: string) {
    const ledger = await loadLedger(this.prisma, groupId);
    requireMember(ledger.members, userId);
    return balanceView(ledger);
  }

  /** Records a payment between two members; only the two people involved can. */
  async settle(userId: string, groupId: string, dto: SettlementDto) {
    await this.prisma.$transaction(async (tx) => {
      await lockGroup(tx, groupId);
      const members = await loadMembers(tx, groupId);
      requireMember(members, userId);
      if (userId !== dto.fromUserId && userId !== dto.toUserId) {
        throw new ForbiddenException(
          'Only the two people involved can record a payment between them',
        );
      }
      if (dto.fromUserId === dto.toUserId) {
        throw new BadRequestException('Pick two different people');
      }
      const isActive = (id: string) =>
        members.some((m) => m.userId === id && m.active);
      if (!isActive(dto.fromUserId) || !isActive(dto.toUserId)) {
        throw new BadRequestException('Both people must be in the group');
      }
      await tx.settlement.create({
        data: {
          groupId,
          fromUserId: dto.fromUserId,
          toUserId: dto.toUserId,
          amount: dto.amount,
        },
      });
    }, TX_OPTIONS);
    return this.balances(userId, groupId);
  }

  /** Undo a payment (either of the two people involved). */
  async undoSettlement(userId: string, groupId: string, settlementId: string) {
    await this.prisma.$transaction(async (tx) => {
      await lockGroup(tx, groupId);
      const members = await loadMembers(tx, groupId);
      requireMember(members, userId);
      const s = await tx.settlement.findFirst({
        where: { id: settlementId, groupId },
      });
      if (!s) throw new NotFoundException('Payment not found');
      if (userId !== s.fromUserId && userId !== s.toUserId) {
        throw new ForbiddenException(
          'Only the two people involved can undo this payment',
        );
      }
      const gone = [s.fromUserId, s.toUserId].find(
        (id) => !members.some((m) => m.userId === id && m.active),
      );
      if (gone) {
        throw new ConflictException(
          'One of them has left the group, so this payment is kept',
        );
      }
      await tx.settlement.delete({ where: { id: s.id } });
    }, TX_OPTIONS);
    return this.balances(userId, groupId);
  }

  // --- dashboard & reports --------------------------------------------------

  /** Group dashboard for one month (PRD §6.13: budget is planned vs actual). */
  async summary(userId: string, groupId: string, month: string) {
    const [group, ledger] = await Promise.all([
      this.prisma.group.findUnique({ where: { id: groupId } }),
      loadLedger(this.prisma, groupId),
    ]);
    const me = requireMember(ledger.members, userId);
    if (!group) throw new NotFoundException('Group not found');

    const inMonth = ledger.expenses.filter((e) =>
      isoDay(e.expenseDate).startsWith(month),
    );
    const total = sum(inMonth.map((e) => paisa(e.amount)));
    const shareOf = (e: GroupExpenseRow, id: string) =>
      paisa(e.participants.find((p) => p.userId === id)?.shareAmount ?? 0);

    const categories = new Map<string, Paisa>();
    for (const e of inMonth) {
      categories.set(
        e.groupCategory!,
        (categories.get(e.groupCategory!) ?? 0) + paisa(e.amount),
      );
    }
    const planned = group.monthlyBudget ? paisa(group.monthlyBudget) : null;

    return {
      month,
      total: taka(total),
      count: inMonth.length,
      myShare: taka(sum(inMonth.map((e) => shareOf(e, userId)))),
      iPaid: taka(
        sum(
          inMonth
            .filter((e) => e.paidBy === userId)
            .map((e) => paisa(e.amount)),
        ),
      ),
      myBalance: taka(ledger.balances.get(userId) ?? 0),
      budget: {
        planned: planned === null ? null : taka(planned),
        spent: taka(total),
        remaining: planned === null ? null : taka(planned - total),
        percent:
          planned === null ? null : Math.round((total / planned) * 1000) / 10,
      },
      byCategory: [...categories]
        .map(([category, value]) => ({
          category,
          total: taka(value),
          share: total ? Math.round((value / total) * 1000) / 10 : 0,
        }))
        .sort((a, b) => b.total - a.total),
      byMember: ledger.members
        .map((m) => ({
          userId: m.userId,
          name: m.name,
          active: m.active,
          paid: taka(
            sum(
              inMonth
                .filter((e) => e.paidBy === m.userId)
                .map((e) => paisa(e.amount)),
            ),
          ),
          share: taka(sum(inMonth.map((e) => shareOf(e, m.userId)))),
        }))
        .filter((m) => m.active || m.paid > 0 || m.share > 0),
      recent: inMonth.slice(0, 5).map((e) => expenseView(e, userId, me.role)),
    };
  }

  /**
   * Reports (PRD §6.9) scoped to one group, over a date range (inclusive).
   * Totals are summed in the database. The group budget is one monthly
   * amount, so the plan is that amount × the months the range covers
   * completely, compared with the spending in those months.
   */
  async report(
    userId: string,
    groupId: string,
    range: ReportRange,
    filterCategories: string[] = [],
  ) {
    assertDateRange(range);
    const prev = previousOf(range);
    const trend = trendOf(range);
    const fullMonths = fullMonthsOf(range);
    const day = (d: string) => new Date(`${d}T00:00:00.000Z`);
    const start = day(range.start);
    const end = day(addDays(range.end, 1)); // the day after the range
    // Only known category keys are applied; [] means all.
    const categories = filterCategories.filter((c) =>
      (CATEGORY_ICONS as readonly string[]).includes(c),
    );
    const [members, group, allTotals, people] = await Promise.all([
      loadMembers(this.prisma, groupId),
      this.prisma.group.findUnique({ where: { id: groupId } }),
      this.prisma.$queryRaw<
        { date: string; category: string; paisa: number; count: number }[]
      >`
        SELECT to_char(e.expense_date, 'YYYY-MM-DD') AS date,
               e.group_category AS category,
               (sum(e.amount) * 100)::float8 AS paisa,
               count(*)::int AS count
        FROM expenses e
        WHERE e.group_id = ${groupId}::uuid
          AND e.expense_date >= ${day(prev.start)}
          AND e.expense_date < ${end}
          AND (cardinality(${categories}::text[]) = 0
               OR e.group_category = ANY(${categories}::text[]))
        GROUP BY 1, 2`,
      this.prisma.$queryRaw<{ user_id: string; paid: number; share: number }[]>`
        SELECT m.user_id,
          coalesce((SELECT sum(e.amount) * 100 FROM expenses e
                    WHERE e.group_id = m.group_id AND e.paid_by = m.user_id
                      AND e.expense_date >= ${start} AND e.expense_date < ${end}
                      AND (cardinality(${categories}::text[]) = 0
                           OR e.group_category = ANY(${categories}::text[]))), 0)::float8 AS paid,
          coalesce((SELECT sum(p.share_amount) * 100 FROM expense_participants p
                    JOIN expenses e ON e.id = p.expense_id
                    WHERE e.group_id = m.group_id AND p.user_id = m.user_id
                      AND e.expense_date >= ${start} AND e.expense_date < ${end}
                      AND (cardinality(${categories}::text[]) = 0
                           OR e.group_category = ANY(${categories}::text[]))), 0)::float8 AS share
        FROM group_members m
        WHERE m.group_id = ${groupId}::uuid`,
    ]);
    requireMember(members, userId);
    if (!group) throw new NotFoundException('Group not found');

    const totals = allTotals.filter((r) => r.date >= range.start);
    const total = sum(totals.map((r) => r.paisa));
    const previousTotal = sum(
      allTotals.filter((r) => r.date <= prev.end).map((r) => r.paisa),
    );
    const byCategory = new Map<string, Paisa>();
    const byKey = new Map<string, { paisa: Paisa; count: number }>();
    for (const r of totals) {
      byCategory.set(r.category, (byCategory.get(r.category) ?? 0) + r.paisa);
      const k = trend.keyOf(r.date);
      const m = byKey.get(k) ?? { paisa: 0, count: 0 };
      byKey.set(k, { paisa: m.paisa + r.paisa, count: m.count + r.count });
    }
    const sums = new Map(people.map((p) => [p.user_id, p]));
    const planned =
      group.monthlyBudget && fullMonths.length
        ? paisa(group.monthlyBudget) * fullMonths.length
        : null;
    const spentInFullMonths = sum(
      totals
        .filter((r) => fullMonths.includes(r.date.slice(0, 7)))
        .map((r) => r.paisa),
    );

    return {
      scope: 'group' as const,
      group: { id: group.id, name: group.name },
      ...rangeFields(range),
      fullMonths,
      total: taka(total),
      count: totals.reduce((t, r) => t + r.count, 0),
      myShare: taka(sums.get(userId)?.share ?? 0),
      filters: { categories, wallets: [] as string[] },
      previous: {
        ...prev,
        total: taka(previousTotal),
        change: changePercent(total, previousTotal),
      },
      byCategory: [...byCategory]
        .map(([category, value]) => ({
          id: category,
          icon: category,
          total: taka(value),
          share: total ? Math.round((value / total) * 1000) / 10 : 0,
        }))
        .sort((a, b) => b.total - a.total),
      byMember: members
        .map((m) => ({
          userId: m.userId,
          name: m.name,
          active: m.active,
          paid: taka(sums.get(m.userId)?.paid ?? 0),
          share: taka(sums.get(m.userId)?.share ?? 0),
        }))
        .filter((m) => m.active || m.paid > 0 || m.share > 0)
        .sort((a, b) => b.share - a.share),
      trendBy: trend.by,
      trend: trend.keys.map((key) => ({
        key,
        total: taka(byKey.get(key)?.paisa ?? 0),
        count: byKey.get(key)?.count ?? 0,
      })),
      budget: {
        planned: planned === null ? null : taka(planned),
        spent: taka(spentInFullMonths),
        percent: planned
          ? Math.floor((spentInFullMonths * 100) / planned)
          : null,
        status:
          planned === null ? 'none' : budgetStatus(spentInFullMonths, planned),
      },
    };
  }

  /**
   * My part of group spending in a month, for the personal monthly report.
   * Kept separate from personal totals and category budgets (decided
   * 2026-11-16). Includes groups I have since left.
   */
  async myMonth(userId: string, month: string) {
    const { from, to } = monthRange(month);
    const rows = await this.prisma.$queryRaw<
      { id: string; name: string; my_share: number; paid: number }[]
    >`
      SELECT g.id, g.name,
        coalesce((SELECT sum(p.share_amount) FROM expense_participants p
                   JOIN expenses e ON e.id = p.expense_id
                  WHERE e.group_id = g.id AND p.user_id = m.user_id
                    AND e.expense_date >= ${from} AND e.expense_date < ${to}), 0)::float8 AS my_share,
        coalesce((SELECT sum(e.amount) FROM expenses e
                  WHERE e.group_id = g.id AND e.paid_by = m.user_id
                    AND e.expense_date >= ${from} AND e.expense_date < ${to}), 0)::float8 AS paid
      FROM group_members m
      JOIN groups g ON g.id = m.group_id
      WHERE m.user_id = ${userId}::uuid
      ORDER BY g.name`;
    const groups = rows
      .filter((r) => r.my_share > 0 || r.paid > 0)
      .map((r) => ({
        groupId: r.id,
        name: r.name,
        myShare: r.my_share,
        paid: r.paid,
      }))
      .sort((a, b) => b.myShare - a.myShare);
    return {
      month,
      myShare: taka(sum(groups.map((g) => toPaisa(g.myShare)))),
      paid: taka(sum(groups.map((g) => toPaisa(g.paid)))),
      groups,
    };
  }
}

function expenseFields(dto: GroupExpenseDto) {
  return {
    amount: dto.amount,
    description: dto.description,
    expenseDate: dayDate(dto.expenseDate),
    groupCategory: dto.category,
    paidBy: dto.paidBy,
    splitType: dto.splitType,
  } satisfies Partial<Prisma.ExpenseUncheckedCreateInput>;
}

async function findExpense(
  tx: Prisma.TransactionClient,
  groupId: string,
  expenseId: string,
) {
  const expense = await tx.expense.findFirst({
    where: { id: expenseId, groupId },
    include: groupExpenseInclude,
  });
  if (!expense) throw new NotFoundException('Expense not found');
  return expense;
}

/**
 * Someone who left was settled at ৳0 when they went; changing an expense they
 * were part of would reopen their balance, so it stays as it is.
 */
function assertEveryoneStillHere(
  members: Member[],
  expense: GroupExpenseRow,
  action: string,
) {
  const involved = [
    expense.paidBy!,
    ...expense.participants.map((p) => p.userId),
  ];
  const gone = members.find((m) => !m.active && involved.includes(m.userId));
  if (gone) {
    throw new ConflictException(
      `${gone.name} has left the group, so this expense can't be ${action}`,
    );
  }
}
