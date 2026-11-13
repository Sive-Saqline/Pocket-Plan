import { CategoryBadge } from "@/components/ui/icons";
import type { Category, Expense, Wallet } from "@/lib/ledger";
import { formatTaka } from "@/lib/money";

export function ExpenseRow({
  expense,
  category,
  wallet,
  onSelect,
}: {
  expense: Expense;
  category?: Category;
  wallet?: Wallet;
  onSelect: (expense: Expense) => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(expense)}
        className="flex min-h-16 w-full items-center gap-3 rounded-lg px-1 py-2 text-left hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-accent"
      >
        <CategoryBadge icon={category?.icon} />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{expense.description || category?.name || "Expense"}</span>
          <span className="block truncate text-sm text-text-muted">
            {category?.name ?? "Uncategorised"}
            {wallet && ` · ${wallet.name}`}
          </span>
        </span>
        <span className="font-mono text-lg font-semibold tabular-nums">{formatTaka(expense.amount)}</span>
      </button>
    </li>
  );
}
