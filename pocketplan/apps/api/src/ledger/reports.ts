import { BadRequestException } from '@nestjs/common';
import { budgetStatus, type BudgetStatus } from './budgets';
import type { SavingsStatus } from './savings';
import {
  SAVINGS_KEY,
  type Category,
  type UserLedger,
  type Wallet,
} from './ledger.types';

/** Longest range in months (PRD §6.9: monthly trend over 6–12 months). */
export const MAX_REPORT_MONTHS = 12;
/** Longest custom range in days (a year, leap years included). */
export const MAX_REPORT_DAYS = 366;
/** Ranges up to this many days show a day-by-day trend; longer ones, monthly. */
export const DAILY_TREND_MAX_DAYS = 62;

/**
 * A report covers whole days, start and end included (YYYY-MM-DD). The
 * month presets are ranges from the 1st of one month to the last day of
 * another.
 */
export interface ReportRange {
  start: string;
  end: string;
}

/**
 * Personal spending in a date range, already totalled by the database
 * (one row per day × category × wallet), plus what's needed to label it.
 * Amounts are whole paisa so totals add up exactly.
 */
export interface ReportSource {
  categories: Category[];
  accounts: Wallet[];
  /** Budgets of the months the range touches. */
  budgets: { categoryId: string; month: string; planned: number }[];
  /** Savings targets of the months the range touches. */
  savings: { month: string; target: number }[];
  totals: SpendTotal[];
}

export interface SpendTotal {
  /** YYYY-MM-DD */
  date: string;
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
  { start, end }: ReportRange,
): ReportSource {
  const touched = (month: string) =>
    month >= start.slice(0, 7) && month <= end.slice(0, 7);
  const totals = new Map<string, SpendTotal>();
  for (const e of ledger.expenses) {
    const date = e.expenseDate;
    if (date < start || date > end) continue;
    const key = `${date}|${e.categoryId}|${e.accountId}`;
    const row = totals.get(key) ?? {
      date,
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
      .filter((b) => touched(b.month))
      .map((b) => ({
        categoryId: b.categoryId,
        month: b.month,
        planned: toPaisa(b.plannedAmount),
      })),
    savings: ledger.savings
      .filter((g) => touched(g.month))
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

// --- months and days ------------------------------------------------------------

const MS_PER_DAY = 86_400_000;
const utc = (date: string) => {
  const [y, m, d] = date.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};
const isoOf = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** `date` moved by `delta` days (YYYY-MM-DD). */
export function addDays(date: string, delta: number): string {
  return isoOf(utc(date) + delta * MS_PER_DAY);
}

/** Days from `start` to `end`, both included. */
export function dayCount({ start, end }: ReportRange): number {
  return Math.round((utc(end) - utc(start)) / MS_PER_DAY) + 1;
}

/** `month` moved by `delta` months (YYYY-MM). */
export function addMonths(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const i = y * 12 + m - 1 + delta;
  return `${Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, '0')}`;
}

/** The last day of a month (YYYY-MM-DD). */
export function lastDay(month: string): string {
  return addDays(`${addMonths(month, 1)}-01`, -1);
}

/** Whole months `from`..`to` (YYYY-MM) as a date range. */
export function monthsRange(from: string, to: string): ReportRange {
  return { start: `${from}-01`, end: lastDay(to) };
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

/** True when the range starts on a 1st and ends on a month's last day. */
export function isWholeMonths({ start, end }: ReportRange): boolean {
  return start.endsWith('-01') && end === lastDay(end.slice(0, 7));
}

/** Months the range covers completely (budgets and savings are monthly). */
export function fullMonthsOf(range: ReportRange): string[] {
  return monthsBetween(range.start.slice(0, 7), range.end.slice(0, 7)).filter(
    (m) => range.start <= `${m}-01` && range.end >= lastDay(m),
  );
}

/** 400 for a backwards or over-long month range (YYYY-MM). */
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

/** 400 for a backwards, impossible or over-long date range. */
export function assertDateRange(range: ReportRange) {
  for (const d of [range.start, range.end]) {
    if (isoOf(utc(d)) !== d) {
      throw new BadRequestException(`${d} is not a real date`);
    }
  }
  if (range.start > range.end) {
    throw new BadRequestException('The start date must come before the end');
  }
  if (dayCount(range) > MAX_REPORT_DAYS) {
    throw new BadRequestException('Reports cover at most one year');
  }
}

/**
 * What to compare with: the same number of months just before (whole
 * months, e.g. Jun–Aug before Sep–Nov), otherwise the same number of days.
 */
export function previousOf(range: ReportRange): ReportRange {
  if (isWholeMonths(range)) {
    const from = range.start.slice(0, 7);
    const count = monthsBetween(from, range.end.slice(0, 7)).length;
    return monthsRange(addMonths(from, -count), addMonths(from, -1));
  }
  const days = dayCount(range);
  return { start: addDays(range.start, -days), end: addDays(range.start, -1) };
}

/** How a range is shown: by day for short ones, by month otherwise. */
export function trendOf(range: ReportRange) {
  const by: 'day' | 'month' =
    !isWholeMonths(range) && dayCount(range) <= DAILY_TREND_MAX_DAYS
      ? 'day'
      : 'month';
  const keys =
    by === 'day'
      ? Array.from({ length: dayCount(range) }, (_, i) =>
          addDays(range.start, i),
        )
      : monthsBetween(range.start.slice(0, 7), range.end.slice(0, 7));
  return {
    by,
    keys,
    keyOf: (date: string) => (by === 'day' ? date : date.slice(0, 7)),
  };
}

/** Narrows a report (Step 20). Empty lists mean "all". */
export interface ReportFilters {
  categories?: string[];
  wallets?: string[];
}

/** Change from `before` to `now` in whole percent; null when there was nothing before. */
export function changePercent(now: number, before: number): number | null {
  return before ? Math.round(((now - before) * 100) / before) : null;
}

/** The parts every report (personal or group) shares about its range. */
export function rangeFields(range: ReportRange) {
  return {
    start: range.start,
    end: range.end,
    /** Months the range touches (YYYY-MM); `from`/`to` are the first and last. */
    from: range.start.slice(0, 7),
    to: range.end.slice(0, 7),
    months: monthsBetween(range.start.slice(0, 7), range.end.slice(0, 7)),
    days: dayCount(range),
    wholeMonths: isWholeMonths(range),
  };
}

/** Totals one key at a time, keeping the order keys first appear in. */
function totalBy<K>(rows: SpendTotal[], key: (r: SpendTotal) => K) {
  const out = new Map<K, number>();
  for (const r of rows) out.set(key(r), (out.get(key(r)) ?? 0) + r.paisa);
  return out;
}

/**
 * The five PRD §6.9 reports for one user over a date range, optionally
 * narrowed to some categories and wallets. `source` may also hold the
 * previous range (see previousOf), which gives the comparison total.
 */
export function personalReport(
  source: ReportSource,
  range: ReportRange,
  filters: ReportFilters = {},
) {
  // Only ids that exist are applied (a link may name a deleted category).
  const categories = (filters.categories ?? []).filter((id) =>
    source.categories.some((c) => c.id === id),
  );
  const wallets = (filters.wallets ?? []).filter((id) =>
    source.accounts.some((a) => a.id === id),
  );
  const matches = (r: SpendTotal) =>
    (!categories.length || categories.includes(r.categoryId)) &&
    (!wallets.length || wallets.includes(r.accountId));
  const within = (r: SpendTotal, { start, end }: ReportRange) =>
    r.date >= start && r.date <= end;

  const rows = source.totals.filter((r) => within(r, range) && matches(r));
  const total = rows.reduce((t, r) => t + r.paisa, 0);
  const prev = previousOf(range);
  const previousTotal = source.totals
    .filter((r) => within(r, prev) && matches(r))
    .reduce((t, r) => t + r.paisa, 0);

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

  const trend = trendOf(range);
  const byKey = totalBy(rows, (r) => trend.keyOf(r.date));
  const countByKey = new Map<string, number>();
  for (const r of rows) {
    const k = trend.keyOf(r.date);
    countByKey.set(k, (countByKey.get(k) ?? 0) + r.count);
  }

  const fullMonths = fullMonthsOf(range);
  return {
    scope: 'personal' as const,
    ...rangeFields(range),
    /** Months the range covers completely: the ones budgets and savings use. */
    fullMonths,
    total: taka(total),
    count: rows.reduce((t, r) => t + r.count, 0),
    filters: { categories, wallets },
    previous: {
      ...prev,
      total: taka(previousTotal),
      change: changePercent(total, previousTotal),
    },
    byCategory,
    byWallet,
    trendBy: trend.by,
    trend: trend.keys.map((key) => ({
      key,
      total: taka(byKey.get(key) ?? 0),
      count: countByKey.get(key) ?? 0,
    })),
    budget: budgetUse(source, rows, fullMonths, categories),
    savings: savingsProgress(source, rows, fullMonths),
  };
}

export type PersonalReport = ReturnType<typeof personalReport>;

/**
 * Planned vs actual per category. Budgets are monthly, so only months the
 * range covers completely count, and spending only counts in the months
 * that category had a budget: a plan is never compared with part of a month
 * or with unplanned months.
 */
function budgetUse(
  source: ReportSource,
  rows: SpendTotal[],
  fullMonths: string[],
  /** When set, only these categories' budgets count. */
  categories: string[],
) {
  const spentIn = totalBy(rows, (r) => `${r.categoryId}|${r.date.slice(0, 7)}`);
  const planned = new Map<string, number>();
  const spent = new Map<string, number>();
  for (const b of source.budgets) {
    if (!fullMonths.includes(b.month)) continue;
    if (categories.length && !categories.includes(b.categoryId)) continue;
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

/**
 * Saved (expenses in the Savings category, PRD §6.8) against the monthly
 * targets, over the months the range covers completely.
 */
function savingsProgress(
  source: ReportSource,
  rows: SpendTotal[],
  months: string[],
) {
  const category =
    source.categories.find((c) => c.systemKey === SAVINGS_KEY) ?? null;
  const savedBy = totalBy(
    rows.filter(
      (r) =>
        r.categoryId === category?.id && months.includes(r.date.slice(0, 7)),
    ),
    (r) => r.date.slice(0, 7),
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
