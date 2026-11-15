export type WalletType = "CASH" | "BANK" | "CARD" | "MOBILE_WALLET" | "OTHER";

export interface Category {
  id: string;
  name: string;
  icon: string;
}

export interface Wallet {
  id: string;
  name: string;
  type: WalletType;
  /** Typed in by the user, informational only (PRD Decision 6); may be negative. */
  balance: number;
}

export interface Expense {
  id: string;
  amount: number;
  categoryId: string;
  accountId: string;
  description: string;
  expenseDate: string;
  createdAt: string;
}

export interface ExpenseInput {
  amount: number;
  categoryId: string;
  accountId: string;
  expenseDate: string;
  description: string;
}

export interface MonthSummary {
  month: string;
  total: number;
  count: number;
  previousMonth: string;
  previousTotal: number;
  byCategory: { categoryId: string; name: string; icon: string; total: number; share: number }[];
  byWallet: { accountId: string; name: string; type: WalletType; total: number }[];
  recent: Expense[];
  budget: { planned: number; spentOnBudgeted: number; lines: BudgetLine[] };
}

export type BudgetStatus = "none" | "under" | "near" | "over";

export interface BudgetLine {
  categoryId: string;
  name: string;
  icon: string;
  planned: number | null;
  spent: number;
  remaining: number | null;
  percent: number | null;
  status: BudgetStatus;
}

export interface BudgetView {
  month: string;
  planned: number;
  spentOnBudgeted: number;
  spent: number;
  lines: BudgetLine[];
}

// Icons for these live in components/ui/icons.tsx (WalletIcon).
export const walletTypes: { value: WalletType; label: string }[] = [
  { value: "CASH", label: "Cash" },
  { value: "MOBILE_WALLET", label: "Mobile wallet" },
  { value: "BANK", label: "Bank" },
  { value: "CARD", label: "Card" },
  { value: "OTHER", label: "Other" },
];

export type Frequency = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";

export const frequencies: { value: Frequency; label: string; every: string }[] = [
  { value: "DAILY", label: "Daily", every: "Every day" },
  { value: "WEEKLY", label: "Weekly", every: "Every week" },
  { value: "MONTHLY", label: "Monthly", every: "Every month" },
  { value: "YEARLY", label: "Yearly", every: "Every year" },
];

export const frequencyLabel = (f: Frequency) => frequencies.find((x) => x.value === f)?.label ?? f;

export interface RecurringExpense {
  id: string;
  amount: number;
  categoryId: string;
  accountId: string;
  description: string;
  frequency: Frequency;
  startDate: string;
  nextDueDate: string;
  isActive: boolean;
  /** Computed by the API against the client's today. */
  due: boolean;
  dueCount: number;
}
