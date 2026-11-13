import type { ReactNode } from "react";
import { currentMonth, monthLabel, shiftMonth } from "@/lib/dates";

export function MonthSwitcher({
  month,
  onChange,
  caption,
  maxMonth = currentMonth(),
}: {
  month: string;
  onChange: (month: string) => void;
  caption?: ReactNode;
  /** Latest month the user can move to (YYYY-MM). */
  maxMonth?: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-surface p-2 shadow-card">
      <button
        type="button"
        onClick={() => onChange(shiftMonth(month, -1))}
        aria-label="Previous month"
        className="grid size-11 place-items-center rounded-lg text-xl hover:bg-surface-muted"
      >
        ‹
      </button>
      <div className="text-center">
        <p className="font-semibold">{monthLabel(month)}</p>
        {caption && <p className="font-mono text-sm text-text-muted tabular-nums">{caption}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(shiftMonth(month, 1))}
        disabled={month >= maxMonth}
        aria-label="Next month"
        className="grid size-11 place-items-center rounded-lg text-xl hover:bg-surface-muted disabled:opacity-30 disabled:hover:bg-transparent"
      >
        ›
      </button>
    </div>
  );
}
