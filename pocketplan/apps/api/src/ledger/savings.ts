import { SAVINGS_KEY, UserLedger } from './ledger.types';

/** 'none' = no target this month; 'reached' once saved ≥ target. */
export type SavingsStatus = 'none' | 'saving' | 'reached';

export interface SavingsView {
  month: string;
  /** null when no target is set for this month. */
  target: number | null;
  /** This month's expenses in the Savings category (PRD §6.8): never stored. */
  saved: number;
  /** target − saved, never below 0. null without a target. */
  remaining: number | null;
  /** Whole percent of the target saved, rounded down; may exceed 100. */
  percent: number | null;
  status: SavingsStatus;
  /** The category that counts as saving (whatever the user has renamed it to). */
  category: { id: string; name: string; icon: string } | null;
}

const paisa = (taka: number) => Math.round(taka * 100);

/** Savings target vs. saved for one month (YYYY-MM). */
export function savingsView(ledger: UserLedger, month: string): SavingsView {
  const category =
    ledger.categories.find((c) => c.systemKey === SAVINGS_KEY) ?? null;
  const saved = category
    ? ledger.expenses
        .filter(
          (e) =>
            e.categoryId === category.id && e.expenseDate.startsWith(month),
        )
        .reduce((total, e) => total + paisa(e.amount), 0)
    : 0;
  const goal = ledger.savings.find((g) => g.month === month);
  const target = goal ? paisa(goal.targetAmount) : null;

  return {
    month,
    target: target === null ? null : target / 100,
    saved: saved / 100,
    remaining: target === null ? null : Math.max(target - saved, 0) / 100,
    percent: target === null ? null : Math.floor((saved * 100) / target),
    status: target === null ? 'none' : saved >= target ? 'reached' : 'saving',
    category: category
      ? { id: category.id, name: category.name, icon: category.icon }
      : null,
  };
}
