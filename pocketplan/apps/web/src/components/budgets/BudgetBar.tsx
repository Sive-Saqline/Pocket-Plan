import { TriangleAlert } from "lucide-react";
import type { BudgetStatus } from "@/lib/ledger";
import { formatTaka } from "@/lib/money";

// EXPERIENCE.md §5.6 colours; §6 "no information is colour-only", so every bar has a text label.
const barColor: Record<BudgetStatus, string> = {
  none: "bg-border",
  under: "bg-accent",
  near: "bg-warning",
  over: "bg-danger",
};

export function budgetStatusFor(spent: number, planned: number): BudgetStatus {
  if (spent >= planned) return "over";
  return spent * 100 >= planned * 80 ? "near" : "under";
}

export function BudgetBar({
  spent,
  planned,
  status,
  size = "md",
}: {
  spent: number;
  planned: number;
  status: BudgetStatus;
  size?: "md" | "lg";
}) {
  const percent = planned > 0 ? Math.floor((spent * 100) / planned) : 0;
  return (
    <div
      role="meter"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.min(percent, 100)}
      aria-valuetext={`${percent}% of budget used`}
      className={`overflow-hidden rounded-full bg-surface-muted ${size === "lg" ? "h-2.5" : "h-2"}`}
    >
      <div className={`h-full rounded-full ${barColor[status]}`} style={{ width: `${Math.min(Math.max(percent, 1), 100)}%` }} />
    </div>
  );
}

export function BudgetLabel({ status, remaining, percent }: { status: BudgetStatus; remaining: number; percent: number }) {
  if (status === "over") {
    return (
      <span className="inline-flex items-center gap-1 font-medium text-danger">
        <TriangleAlert aria-hidden size={14} className="shrink-0" />
        {remaining === 0 ? "Budget used up" : `Over by ${formatTaka(-remaining)}`} · {percent}%
      </span>
    );
  }
  if (status === "near") {
    return (
      <span className="inline-flex items-center gap-1.5 font-medium text-[color-mix(in_srgb,var(--warning)_75%,var(--text))]">
        <StatusDot className="bg-warning" />
        Nearly there · {formatTaka(remaining)} left · {percent}%
      </span>
    );
  }
  return (
    <span className="text-text-muted">
      {formatTaka(remaining)} left · {percent}%
    </span>
  );
}

/** Small coloured dot shown next to a text label (never on its own). */
export function StatusDot({ className }: { className: string }) {
  return <span aria-hidden className={`inline-block size-2 shrink-0 rounded-full ${className}`} />;
}
