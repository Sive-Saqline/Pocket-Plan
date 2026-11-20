import type { BudgetStatus, SavingsStatus, WalletType } from "./ledger";

/** GET /reports?from&to (PRD §6.9): one month or a range of up to 12. */
export const RANGE_OPTIONS = [1, 3, 6, 12] as const;
/** Any length up to this can be shown (Ask AI may pick e.g. 2 months). */
export const MAX_MONTHS = 12;
export type RangeMonths = (typeof RANGE_OPTIONS)[number];

/** Longest custom range, in days (the API's limit too). */
export const MAX_DAYS = 366;

export type TrendBy = "day" | "month";

export interface TrendPoint {
  /** YYYY-MM (by month) or YYYY-MM-DD (by day) */
  key: string;
  total: number;
  count: number;
}

/** First and last day, inclusive (YYYY-MM-DD). */
export interface DateRange {
  start: string;
  end: string;
}

export interface ShareRow {
  id: string;
  /** category icon key */
  icon: string;
  total: number;
  /** percent of the period's total, one decimal */
  share: number;
}

interface ReportBase {
  /** The days covered, inclusive (YYYY-MM-DD). */
  start: string;
  end: string;
  /** Months touched; `from`/`to` are the first and last (YYYY-MM). */
  from: string;
  to: string;
  months: string[];
  days: number;
  /** True for the month presets (1st to a last day). */
  wholeMonths: boolean;
  /** Months covered completely: budgets and savings (monthly) use only these. */
  fullMonths: string[];
  total: number;
  count: number;
  /** The filters actually applied (unknown ids are dropped). */
  filters: { categories: string[]; wallets: string[] };
  /** The months (or days) just before, as many as shown, with the same filters. */
  previous: DateRange & { total: number; change: number | null };
  trendBy: TrendBy;
  trend: TrendPoint[];
}

/** What the Reports page shows (Step 20). Categories: ids (personal) or keys (group). */
export interface ReportView extends DateRange {
  groupId: string | null;
  categories: string[];
  wallets: string[];
}

/** POST /ai/insights */
export interface Insights {
  summary: string;
  notable: string;
  forecast: string;
}

/** POST /ai/report-ask */
export interface ReportAnswer {
  view: ReportView;
  answer: string;
  insights: Insights;
}

/** Same view, same key (filter order doesn't matter). */
export const viewKey = (v: ReportView) =>
  JSON.stringify([v.start, v.end, v.groupId, [...v.categories].sort(), [...v.wallets].sort()]);

const parse = (date: string) => {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** The last day of a month (YYYY-MM-DD). */
export const lastDayOf = (month: string) => {
  const [y, m] = month.split("-").map(Number);
  return iso(new Date(y, m, 0));
};

/** Days from start to end, both included. */
export const dayCount = ({ start, end }: DateRange) =>
  Math.round((parse(end).getTime() - parse(start).getTime()) / 86_400_000) + 1;

/** True when the range is whole months (1st to a last day). */
export const isWholeMonths = ({ start, end }: DateRange) =>
  start.endsWith("-01") && end === lastDayOf(end.slice(0, 7));

/** "5 Nov 2026", or "5 Nov" when the year is clear from context. */
export const shortDate = (date: string, withYear = true) =>
  parse(date).toLocaleDateString("en-GB", { day: "numeric", month: "short", ...(withYear && { year: "numeric" }) });

/** "5 – 20 Nov 2026", "28 Oct – 5 Nov 2026", "20 Dec 2025 – 5 Jan 2026". */
export function dayRangeLabel({ start, end }: DateRange) {
  if (start === end) return shortDate(start);
  const sameYear = start.slice(0, 4) === end.slice(0, 4);
  const sameMonth = sameYear && start.slice(0, 7) === end.slice(0, 7);
  const first = sameMonth ? String(parse(start).getDate()) : shortDate(start, !sameYear);
  return `${first} – ${shortDate(end)}`;
}

export interface PersonalReport extends ReportBase {
  scope: "personal";
  byCategory: (ShareRow & { name: string })[];
  byWallet: { id: string; name: string; type: WalletType; total: number; share: number }[];
  budget: {
    planned: number;
    spent: number;
    percent: number | null;
    status: BudgetStatus;
    lines: {
      categoryId: string;
      name: string;
      icon: string;
      planned: number;
      spent: number;
      remaining: number;
      percent: number;
      status: BudgetStatus;
    }[];
  };
  savings: {
    category: { id: string; name: string; icon: string } | null;
    target: number | null;
    saved: number;
    percent: number | null;
    status: SavingsStatus;
    months: { month: string; target: number | null; saved: number }[];
  };
}

/** Same reports for one group (?group_id=). Categories are icon keys. */
export interface GroupReport extends ReportBase {
  scope: "group";
  group: { id: string; name: string };
  myShare: number;
  byCategory: ShareRow[];
  byMember: { userId: string; name: string; active: boolean; paid: number; share: number }[];
  budget: { planned: number | null; spent: number; percent: number | null; status: BudgetStatus };
}

export type Report = PersonalReport | GroupReport;

const compact = new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 });
/** Short amounts for chart axes: ৳950, ৳12K, ৳1.5L. */
export const compactTaka = (amount: number) => `৳${compact.format(amount)}`;
