import type { BudgetStatus, SavingsStatus, WalletType } from "./ledger";

/** GET /reports?from&to (PRD §6.9): one month or a range of up to 12. */
export const RANGE_OPTIONS = [1, 3, 6, 12] as const;
export type RangeMonths = (typeof RANGE_OPTIONS)[number];

export interface TrendPoint {
  month: string;
  total: number;
  count: number;
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
  from: string;
  to: string;
  months: string[];
  total: number;
  count: number;
  trend: TrendPoint[];
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
