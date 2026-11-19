import { BadRequestException } from '@nestjs/common';
import { budgetStatus, type BudgetStatus } from './budgets';
import type { SavingsStatus } from './savings';
import {
  SAVINGS_KEY,
  type Category,
  type UserLedger,
  type Wallet,
} from './ledger.types';

/** Longest range one report covers (PRD §6.9: monthly trend over 6–12 months). */
export const MAX_REPORT_MONTHS = 12;

/**
 * Personal spending in a month range, already totalled by the database
 * (one row per month × category × wallet), plus what's needed to label it.
 * Amounts are whole paisa so totals add up exactly.
 */
export interface ReportSource {
  categories: Category[];
  accounts: Wallet[];
  /** Budgets inside the range. */
  budgets: { categoryId: string; month: string; planned: number }[];
  /** Savings targets inside the range. */
  savings: { month: string; target: number }[];
  totals: SpendTotal[];
}

export interface SpendTotal {
  /** YYYY-MM */
  month: string;
  categoryId: string;
  accountId: string;
  /** Sum of the amounts, in paisa. */
  paisa: number;
  count: number;
}

const toPaisa = (amount: number) => Math.round(amount * 100);

/**
 * The same totals the database computes, worked out from a whole ledger
 * (used by the file store and to check the SQL against).
 */
export function reportSourceFromLedger(
  ledger: UserLedger,
  from: string,
  to: string,
): ReportSource {
  const inRange = (month: string) => month >= from && month <= to;
  const totals = new Map<string, SpendTotal>();
  for (const e of ledger.expenses) {
    const month = e.expenseDate.slice(0, 7);
    if (!inRange(month)) continue;
    const key = `${month}|${e.categoryId}|${e.accountId}`;
    const row = totals.get(key) ?? {
      month,
      categoryId: e.categoryId,
      accountId: e.accountId,
      paisa: 0,
      count: 0,
    };
    row.paisa += toPaisa(e.amount);
    row.count += 1;
    totals.set(key, row);
  }
  return {
    categories: ledger.categories,
    accounts: ledger.accounts,
    budgets: ledger.budgets
      .filter((b) => inRange(b.month))
      .map((b) => ({
        categoryId: b.categoryId,
        month: b.month,
        planned: toPaisa(b.plannedAmount),
      })),
    savings: ledger.savings
      .filter((g) => inRange(g.month))
      .map((g) => ({ month: g.month, target: toPaisa(g.targetAmount) })),
    totals: [...totals.values()],
  };
}

const taka = (paisa: number) => paisa / 100;
/** One decimal, e.g. 33.3 (%). */
const shareOf = (part: number, whole: number) =>
  whole ? Math.round((part / whole) * 1000) / 10 : 0;
/** Whole percent, rounded down so 99.6% never reads "100%". */
const percentOf = (part: number, whole: number) =>
  Math.floor((part * 100) / whole);

/** 400 unless `from` ≤ `to` and the range is at most MAX_REPORT_MONTHS long. */
export function assertReportRange(from: string, to: string) {
  if (from > to) {
    throw new BadRequestException('The start month must come before the end');
  }
  if (monthsBetween(from, to).length > MAX_REPORT_MONTHS) {
    throw new BadRequestException(
      `Reports cover at most ${MAX_REPORT_MONTHS} months`,
    );
  }
}

/** Every month from `from` to `to` inclusive (YYYY-MM). */
export function monthsBetween(from: string, to: string): string[] {
  const [fy, fm] = from.split('-').map(Number);
  const [ty, tm] = to.split('-').map(Number);
  const months: string[] = [];
  for (let i = fy * 12 + fm - 1; i <= ty * 12 + tm - 1; i++) {
    months.push(
      `${Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, '0')}`,
    );
  }
  return months;
}

/** Totals one key at a time, keeping the order keys first appear in. */
function totalBy<K>(rows: SpendTotal[], key: (r: SpendTotal) => K) {
  const out = new Map<K, number>();
  for (const r of rows) out.set(key(r), (out.get(key(r)) ?? 0) + r.paisa);
  return out;
}

/** The five PRD §6.9 reports for one user over a month range. */
export function personalReport(source: ReportSource, from: string, to: string) {
  const months = monthsBetween(from, to);
  const rows = source.totals.filter((r) => r.month >= from && r.month <= to);
  const total = rows.reduce((t, r) => t + r.paisa, 0);

  const byCategoryPaisa = totalBy(rows, (r) => r.categoryId);
  const byCategory = source.categories
    .map((c) => ({ c, spent: byCategoryPaisa.get(c.id) ?? 0 }))
    .filter((x) => x.spent > 0)
    .sort((a, b) => b.spent - a.spent)
    .map(({ c, spent }) => ({
      id: c.id,
      name: c.name,
      icon: c.icon,
      total: taka(spent),
      share: shareOf(spent, total),
    }));

  const byWalletPaisa = totalBy(rows, (r) => r.accountId);
  const byWallet = source.accounts
    .map((a) => ({ a, spent: byWalletPaisa.get(a.id) ?? 0 }))
    .filter((x) => x.spent > 0)
    .sort((a, b) => b.spent - a.spent)
    .map(({ a, spent }) => ({
      id: a.id,
      name: a.name,
      type: a.type,
      total: taka(spent),
      share: shareOf(spent, total),
    }));

  const byMonth = totalBy(rows, (r) => r.month);
  const countByMonth = new Map<string, number>();
  for (const r of rows) {
    countByMonth.set(r.month, (countByMonth.get(r.month) ?? 0) + r.count);
  }
  const trend = months.map((month) => ({
    month,
    total: taka(byMonth.get(month) ?? 0),
    count: countByMonth.get(month) ?? 0,
  }));

  return {
    scope: 'personal' as const,
    from,
    to,
    months,
    total: taka(total),
    count: rows.reduce((t, r) => t + r.count, 0),
    byCategory,
    byWallet,
    trend,
    budget: budgetUse(source, rows, from, to),
    savings: savingsProgress(source, rows, months),
  };
}

export type PersonalReport = ReturnType<typeof personalReport>;

/**
 * Planned vs actual per category. Spending only counts in the months that
 * category had a budget, so a plan is never compared with unplanned months.
 */
function budgetUse(
  source: ReportSource,
  rows: SpendTotal[],
  from: string,
  to: string,
) {
  const spentIn = totalBy(rows, (r) => `${r.categoryId}|${r.month}`);
  const planned = new Map<string, number>();
  const spent = new Map<string, number>();
  for (const b of source.budgets) {
    if (b.month < from || b.month > to) continue;
    planned.set(b.categoryId, (planned.get(b.categoryId) ?? 0) + b.planned);
    spent.set(
      b.categoryId,
      (spent.get(b.categoryId) ?? 0) +
        (spentIn.get(`${b.categoryId}|${b.month}`) ?? 0),
    );
  }

  const lines = source.categories
    .filter((c) => planned.has(c.id))
    .map((c) => {
      const p = planned.get(c.id)!;
      const s = spent.get(c.id) ?? 0;
      return {
        categoryId: c.id,
        name: c.name,
        icon: c.icon,
        planned: taka(p),
        spent: taka(s),
        remaining: taka(p - s),
        percent: p ? percentOf(s, p) : 0,
        status: budgetStatus(s, p),
      };
    })
    .sort((a, b) => b.percent - a.percent || b.spent - a.spent);

  const totalPlanned = [...planned.values()].reduce((t, v) => t + v, 0);
  const totalSpent = [...spent.values()].reduce((t, v) => t + v, 0);
  return {
    planned: taka(totalPlanned),
    spent: taka(totalSpent),
    percent: totalPlanned ? percentOf(totalSpent, totalPlanned) : null,
    status: (totalPlanned
      ? budgetStatus(totalSpent, totalPlanned)
      : 'none') as BudgetStatus,
    lines,
  };
}

/** Saved (expenses in the Savings category, PRD §6.8) against the targets. */
function savingsProgress(
  source: ReportSource,
  rows: SpendTotal[],
  months: string[],
) {
  const category =
    source.categories.find((c) => c.systemKey === SAVINGS_KEY) ?? null;
  const savedBy = totalBy(
    rows.filter((r) => r.categoryId === category?.id),
    (r) => r.month,
  );
  const targetBy = new Map(source.savings.map((g) => [g.month, g.target]));
  const perMonth = months.map((month) => {
    const target = targetBy.get(month);
    return {
      month,
      target: target === undefined ? null : taka(target),
      saved: taka(savedBy.get(month) ?? 0),
    };
  });

  const saved = [...savedBy.values()].reduce((t, v) => t + v, 0);
  const targets = months.filter((m) => targetBy.has(m));
  const target = targets.reduce((t, m) => t + targetBy.get(m)!, 0);
  const hasTarget = targets.length > 0;
  return {
    category: category
      ? { id: category.id, name: category.name, icon: category.icon }
      : null,
    target: hasTarget ? taka(target) : null,
    saved: taka(saved),
    percent: hasTarget && target ? percentOf(saved, target) : null,
    status: (!hasTarget
      ? 'none'
      : saved >= target
        ? 'reached'
        : 'saving') as SavingsStatus,
    months: perMonth,
  };
}
