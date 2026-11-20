import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LedgerStore } from './ledger.store';
import { addDays, type ReportRange, type ReportSource } from './reports';
import type {
  Budget,
  Category,
  Expense,
  RecurringExpense,
  SavingsGoal,
  UserLedger,
  Wallet,
} from './ledger.types';

/**
 * LedgerStore on Supabase Postgres through Prisma.
 *
 * mutate() keeps the store's contract (one user's changes run one at a time;
 * if `change` throws, nothing is saved) by running everything in a single
 * transaction that first locks the user's row. Only rows that actually changed
 * are written.
 *
 * Personal data only for now: group expenses (group_id set) are left out of
 * the ledger and never touched here; roadmap Steps 15-17 add them.
 */

type Tx = Prisma.TransactionClient;

// Remote database: allow for a slow network, but don't hang forever.
const TX_OPTIONS = { maxWait: 15_000, timeout: 30_000 };

/** A timestamp column as the ISO string the ledger uses (stored in UTC). */
const TS = (column: string) =>
  Prisma.raw(`to_char(${column}, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`);

// --- ledger -> row mapping (writes) ------------------------------------------

const toDate = (s: string) => new Date(`${s}T00:00:00.000Z`);

const toCategory = (userId: string, c: Category) => ({
  id: c.id,
  userId,
  name: c.name,
  icon: c.icon,
  systemKey: c.systemKey ?? null,
  createdAt: new Date(c.createdAt),
});

const toAccount = (userId: string, w: Wallet) => ({
  id: w.id,
  userId,
  name: w.name,
  type: w.type,
  balance: w.balance,
  createdAt: new Date(w.createdAt),
  updatedAt: new Date(w.updatedAt),
});

const toExpense = (userId: string, e: Expense) => ({
  id: e.id,
  userId,
  accountId: e.accountId,
  categoryId: e.categoryId,
  amount: e.amount,
  description: e.description,
  expenseDate: toDate(e.expenseDate),
  createdAt: new Date(e.createdAt),
  updatedAt: new Date(e.updatedAt),
});

const toBudget = (userId: string, b: Budget) => {
  const [year, month] = b.month.split('-').map(Number);
  return {
    id: b.id,
    userId,
    categoryId: b.categoryId,
    month,
    year,
    plannedAmount: b.plannedAmount,
    createdAt: new Date(b.createdAt),
    updatedAt: new Date(b.updatedAt),
  };
};

const toSavingsGoal = (userId: string, g: SavingsGoal) => {
  const [year, month] = g.month.split('-').map(Number);
  return {
    id: g.id,
    userId,
    month,
    year,
    targetAmount: g.targetAmount,
    createdAt: new Date(g.createdAt),
    updatedAt: new Date(g.updatedAt),
  };
};

const toRecurring = (userId: string, r: RecurringExpense) => ({
  id: r.id,
  userId,
  accountId: r.accountId,
  categoryId: r.categoryId,
  amount: r.amount,
  description: r.description,
  frequency: r.frequency,
  startDate: toDate(r.startDate),
  nextDueDate: toDate(r.nextDueDate),
  isActive: r.isActive,
  createdAt: new Date(r.createdAt),
  updatedAt: new Date(r.updatedAt),
});

// --- diffing -----------------------------------------------------------------

interface Diff<T> {
  added: T[];
  changed: T[];
  removed: string[];
}

function diff<T extends { id: string }>(before: T[], after: T[]): Diff<T> {
  const old = new Map(before.map((x) => [x.id, JSON.stringify(x)]));
  const ids = new Set(after.map((x) => x.id));
  return {
    added: after.filter((x) => !old.has(x.id)),
    changed: after.filter(
      (x) => old.has(x.id) && old.get(x.id) !== JSON.stringify(x),
    ),
    removed: before.filter((x) => !ids.has(x.id)).map((x) => x.id),
  };
}

@Injectable()
export class PrismaLedgerStore extends LedgerStore {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  read(userId: string) {
    return this.load(this.prisma, userId, false);
  }

  mutate<T>(userId: string, change: (ledger: UserLedger) => T): Promise<T> {
    return this.prisma.$transaction(async (tx) => {
      // Locks the user's row while loading: concurrent changes for the same
      // user wait here, so a double-tap can't save twice.
      const before = await this.load(tx, userId, true);
      const draft = structuredClone(before);
      const result = change(draft);
      await this.save(tx, userId, before, draft);
      return result;
    }, TX_OPTIONS);
  }

  /**
   * Report totals in ONE query: the database sums the expenses (GROUP BY
   * month × category × wallet) instead of sending every row. Amounts come
   * back in whole paisa so they add up exactly.
   */
  async report(userId: string, range: ReportRange) {
    const monthNo = (m: string) => Number(m.slice(0, 7).replace('-', '')); // 2026-11 → 202611
    const from = range.start;
    const to = range.end;
    const start = toDate(range.start);
    const end = toDate(addDays(range.end, 1)); // the day after the range
    const rows = await this.prisma.$queryRaw<ReportSource[]>`
      SELECT
        (SELECT coalesce(json_agg(json_build_object(
            'id', c.id, 'name', c.name, 'icon', c.icon, 'systemKey', c.system_key,
            'createdAt', ${TS('c.created_at')}
          ) ORDER BY c.created_at, c.id), '[]'::json)
          FROM categories c WHERE c.user_id = u.id) AS categories,
        (SELECT coalesce(json_agg(json_build_object(
            'id', a.id, 'name', a.name, 'type', a.type, 'balance', a.balance::float8,
            'createdAt', ${TS('a.created_at')}, 'updatedAt', ${TS('a.updated_at')}
          ) ORDER BY a.created_at, a.id), '[]'::json)
          FROM accounts a WHERE a.user_id = u.id) AS accounts,
        (SELECT coalesce(json_agg(json_build_object(
            'categoryId', b.category_id,
            'month', b.year::text || '-' || lpad(b.month::text, 2, '0'),
            'planned', (b.planned_amount * 100)::float8
          )), '[]'::json)
          FROM budgets b
          WHERE b.user_id = u.id
            AND b.year * 100 + b.month BETWEEN ${monthNo(from)} AND ${monthNo(to)}) AS budgets,
        (SELECT coalesce(json_agg(json_build_object(
            'month', g.year::text || '-' || lpad(g.month::text, 2, '0'),
            'target', (g.target_amount * 100)::float8
          )), '[]'::json)
          FROM savings_goals g
          WHERE g.user_id = u.id
            AND g.year * 100 + g.month BETWEEN ${monthNo(from)} AND ${monthNo(to)}) AS savings,
        (SELECT coalesce(json_agg(t), '[]'::json) FROM (
            SELECT to_char(e.expense_date, 'YYYY-MM-DD') AS "date",
                   e.category_id AS "categoryId",
                   e.account_id AS "accountId",
                   (sum(e.amount) * 100)::float8 AS "paisa",
                   count(*)::int AS "count"
            FROM expenses e
            WHERE e.user_id = u.id AND e.group_id IS NULL
              AND e.expense_date >= ${start} AND e.expense_date < ${end}
            GROUP BY 1, 2, 3
          ) t) AS totals
      FROM users u
      WHERE u.id = ${userId}::uuid`;
    if (rows.length === 0) {
      throw new NotFoundException('Your profile is missing');
    }
    return rows[0];
  }

  /**
   * The whole ledger in ONE query (the database builds the JSON), because
   * every round trip to a remote database costs a few hundred ms.
   */
  private async load(db: Tx | PrismaService, userId: string, lock: boolean) {
    const rows = await db.$queryRaw<UserLedger[]>`
      SELECT
        (SELECT coalesce(json_agg(json_build_object(
            'id', c.id, 'name', c.name, 'icon', c.icon, 'systemKey', c.system_key,
            'createdAt', ${TS('c.created_at')}
          ) ORDER BY c.created_at, c.id), '[]'::json)
          FROM categories c WHERE c.user_id = u.id) AS categories,
        (SELECT coalesce(json_agg(json_build_object(
            'id', a.id, 'name', a.name, 'type', a.type, 'balance', a.balance::float8,
            'createdAt', ${TS('a.created_at')}, 'updatedAt', ${TS('a.updated_at')}
          ) ORDER BY a.created_at, a.id), '[]'::json)
          FROM accounts a WHERE a.user_id = u.id) AS accounts,
        (SELECT coalesce(json_agg(json_build_object(
            'id', e.id, 'accountId', e.account_id, 'categoryId', e.category_id,
            'amount', e.amount::float8, 'description', e.description,
            'expenseDate', to_char(e.expense_date, 'YYYY-MM-DD'),
            'createdAt', ${TS('e.created_at')}, 'updatedAt', ${TS('e.updated_at')}
          ) ORDER BY e.created_at, e.id), '[]'::json)
          FROM expenses e WHERE e.user_id = u.id AND e.group_id IS NULL) AS expenses,
        (SELECT coalesce(json_agg(json_build_object(
            'id', b.id, 'categoryId', b.category_id,
            'month', b.year::text || '-' || lpad(b.month::text, 2, '0'),
            'plannedAmount', b.planned_amount::float8,
            'createdAt', ${TS('b.created_at')}, 'updatedAt', ${TS('b.updated_at')}
          ) ORDER BY b.created_at, b.id), '[]'::json)
          FROM budgets b WHERE b.user_id = u.id) AS budgets,
        (SELECT coalesce(json_agg(json_build_object(
            'id', r.id, 'accountId', r.account_id, 'categoryId', r.category_id,
            'amount', r.amount::float8, 'description', r.description,
            'frequency', r.frequency,
            'startDate', to_char(r.start_date, 'YYYY-MM-DD'),
            'nextDueDate', to_char(r.next_due_date, 'YYYY-MM-DD'),
            'isActive', r.is_active,
            'createdAt', ${TS('r.created_at')}, 'updatedAt', ${TS('r.updated_at')}
          ) ORDER BY r.created_at, r.id), '[]'::json)
          FROM recurring_expenses r WHERE r.user_id = u.id) AS recurring,
        (SELECT coalesce(json_agg(json_build_object(
            'id', g.id,
            'month', g.year::text || '-' || lpad(g.month::text, 2, '0'),
            'targetAmount', g.target_amount::float8,
            'createdAt', ${TS('g.created_at')}, 'updatedAt', ${TS('g.updated_at')}
          ) ORDER BY g.created_at, g.id), '[]'::json)
          FROM savings_goals g WHERE g.user_id = u.id) AS savings
      FROM users u
      WHERE u.id = ${userId}::uuid
      ${lock ? Prisma.sql`FOR UPDATE` : Prisma.empty}`;
    if (rows.length === 0) {
      throw new NotFoundException('Your profile is missing');
    }
    return rows[0];
  }

  /**
   * Writes the difference. Order matters for foreign keys and unique rules:
   * remove children, remove parents, add/update parents, then update/add
   * children (parents = categories and wallets).
   */
  private async save(
    tx: Tx,
    userId: string,
    before: UserLedger,
    after: UserLedger,
  ) {
    const categories = diff(before.categories, after.categories);
    const accounts = diff(before.accounts, after.accounts);
    const expenses = diff(before.expenses, after.expenses);
    const budgets = diff(before.budgets, after.budgets);
    const recurring = diff(before.recurring, after.recurring);
    const savings = diff(before.savings, after.savings);
    const mine = (ids: string[]) => ({ where: { userId, id: { in: ids } } });

    if (expenses.removed.length)
      await tx.expense.deleteMany(mine(expenses.removed));
    if (budgets.removed.length)
      await tx.budget.deleteMany(mine(budgets.removed));
    if (recurring.removed.length)
      await tx.recurringExpense.deleteMany(mine(recurring.removed));
    if (savings.removed.length)
      await tx.savingsGoal.deleteMany(mine(savings.removed));
    if (categories.removed.length)
      await tx.category.deleteMany(mine(categories.removed));
    if (accounts.removed.length)
      await tx.account.deleteMany(mine(accounts.removed));

    if (categories.added.length)
      await tx.category.createMany({
        data: categories.added.map((c) => toCategory(userId, c)),
      });
    if (accounts.added.length)
      await tx.account.createMany({
        data: accounts.added.map((a) => toAccount(userId, a)),
      });
    for (const c of categories.changed) {
      const { id, ...data } = toCategory(userId, c);
      await tx.category.update({ where: { id }, data });
    }
    for (const a of accounts.changed) {
      const { id, ...data } = toAccount(userId, a);
      await tx.account.update({ where: { id }, data });
    }

    for (const e of expenses.changed) {
      const { id, ...data } = toExpense(userId, e);
      await tx.expense.update({ where: { id }, data });
    }
    for (const b of budgets.changed) {
      const { id, ...data } = toBudget(userId, b);
      await tx.budget.update({ where: { id }, data });
    }
    for (const r of recurring.changed) {
      const { id, ...data } = toRecurring(userId, r);
      await tx.recurringExpense.update({ where: { id }, data });
    }
    for (const g of savings.changed) {
      const { id, ...data } = toSavingsGoal(userId, g);
      await tx.savingsGoal.update({ where: { id }, data });
    }
    if (savings.added.length)
      await tx.savingsGoal.createMany({
        data: savings.added.map((g) => toSavingsGoal(userId, g)),
      });
    if (expenses.added.length)
      await tx.expense.createMany({
        data: expenses.added.map((e) => toExpense(userId, e)),
      });
    if (budgets.added.length)
      await tx.budget.createMany({
        data: budgets.added.map((b) => toBudget(userId, b)),
      });
    if (recurring.added.length)
      await tx.recurringExpense.createMany({
        data: recurring.added.map((r) => toRecurring(userId, r)),
      });
  }
}
