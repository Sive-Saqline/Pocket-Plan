import { UserLedger } from './ledger.types';

/** EXPERIENCE.md §5.6: under < 80% ≤ near < 100% ≤ over. */
export type BudgetStatus = 'none' | 'under' | 'near' | 'over';

export interface BudgetLine {
  categoryId: string;
  name: string;
  icon: string;
  /** null = "Not budgeted" for this month. */
  planned: number | null;
  spent: number;
  /** planned − spent; negative when over. null when not budgeted. */
  remaining: number | null;
  /** Whole percent of the plan used, rounded down so 99.6% never reads "100%". */
  percent: number | null;
  status: BudgetStatus;
}

export interface BudgetView {
  month: string;
  /** Sum of all planned amounts this month. */
  planned: number;
  /** Spending in budgeted categories only, so it compares fairly with `planned`. */
  spentOnBudgeted: number;
  /** All spending this month, budgeted or not. */
  spent: number;
  lines: BudgetLine[];
}

const paisa = (taka: number) => Math.round(taka * 100);

export function budgetStatus(
  spentPaisa: number,
  plannedPaisa: number | null,
): BudgetStatus {
  if (plannedPaisa === null) return 'none';
  if (spentPaisa >= plannedPaisa) return 'over';
  return spentPaisa * 100 >= plannedPaisa * 80 ? 'near' : 'under';
}

/** Planned vs actual per category for one month (YYYY-MM). */
export function budgetView(ledger: UserLedger, month: string): BudgetView {
  const spentBy = new Map<string, number>();
  for (const e of ledger.expenses) {
    if (!e.expenseDate.startsWith(month)) continue;
    spentBy.set(
      e.categoryId,
      (spentBy.get(e.categoryId) ?? 0) + paisa(e.amount),
    );
  }
  const plannedBy = new Map(
    ledger.budgets
      .filter((b) => b.month === month)
      .map((b) => [b.categoryId, paisa(b.plannedAmount)]),
  );

  const lines: BudgetLine[] = ledger.categories.map((c) => {
    const spent = spentBy.get(c.id) ?? 0;
    const planned = plannedBy.get(c.id) ?? null;
    return {
      categoryId: c.id,
      name: c.name,
      icon: c.icon,
      planned: planned === null ? null : planned / 100,
      spent: spent / 100,
      remaining: planned === null ? null : (planned - spent) / 100,
      percent: planned === null ? null : Math.floor((spent * 100) / planned),
      status: budgetStatus(spent, planned),
    };
  });

  // Budgeted first, most-used first; then the rest by spending.
  lines.sort(
    (a, b) =>
      Number(b.planned !== null) - Number(a.planned !== null) ||
      (b.percent ?? 0) - (a.percent ?? 0) ||
      b.spent - a.spent,
  );

  const budgeted = lines.filter((l) => l.planned !== null);
  return {
    month,
    planned: budgeted.reduce((t, l) => t + paisa(l.planned!), 0) / 100,
    spentOnBudgeted: budgeted.reduce((t, l) => t + paisa(l.spent), 0) / 100,
    spent: [...spentBy.values()].reduce((t, v) => t + v, 0) / 100,
    lines,
  };
}
