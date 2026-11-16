"use client";

import { CircleCheck, PiggyBank } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { monthLabel } from "@/lib/dates";
import type { SavingsView } from "@/lib/ledger";
import { formatTaka } from "@/lib/money";

/** Savings target vs. saved for one month, with a button to set or change the target. */
export function SavingsCard({
  savings: v,
  onEdit,
  className = "",
}: {
  savings: SavingsView;
  onEdit: () => void;
  className?: string;
}) {
  const categoryName = v.category?.name ?? "Savings";
  return (
    <Card
      title="Savings goal"
      className={className}
      aside={
        <Button variant="ghost" size="sm" className="text-accent hover:text-accent" onClick={onEdit}>
          {v.target === null ? "Set target" : "Edit"}
        </Button>
      }
    >
      {v.target === null ? (
        <button
          type="button"
          onClick={onEdit}
          className="flex w-full items-center gap-3 rounded-lg border border-dashed border-border p-3 text-left hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-accent"
        >
          <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full bg-accent/10 text-accent">
            <PiggyBank size={20} strokeWidth={1.75} />
          </span>
          <span className="flex-1">
            <span className="block font-medium">Set a savings target for {monthLabel(v.month, { short: true })}.</span>
            <span className="block text-sm text-text-muted">
              {v.saved > 0
                ? `You've put aside ${formatTaka(v.saved)} so far.`
                : `Log money you put aside as a ${categoryName} expense and we'll track it.`}
            </span>
          </span>
        </button>
      ) : (
        <div className="pt-1">
          <p className="font-mono tabular-nums">
            <span className="text-2xl font-bold">{formatTaka(v.saved)}</span>
            <span className="text-text-muted"> of {formatTaka(v.target)}</span>
          </p>
          <div className="mt-2">
            <SavingsBar view={v} />
          </div>
          <p className="mt-1.5 text-sm">
            {v.status === "reached" ? (
              // Darkened like the budget "near" label so small text keeps 4.5:1 contrast.
              <span className="inline-flex items-center gap-1 font-medium text-[color-mix(in_srgb,var(--success)_75%,var(--text))]">
                <CircleCheck aria-hidden size={14} className="shrink-0" />
                Target reached · {v.percent}%
              </span>
            ) : (
              <span className="text-text-muted">
                {formatTaka(v.remaining!)} to go · {v.percent}%
              </span>
            )}
          </p>
          <p className="mt-2 text-xs text-text-muted">Counted from your {categoryName} expenses this month.</p>
        </div>
      )}
    </Card>
  );
}

export function SavingsBar({ view: v }: { view: Pick<SavingsView, "percent" | "status"> }) {
  const percent = v.percent ?? 0;
  return (
    <div
      role="meter"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.min(percent, 100)}
      aria-valuetext={`${percent}% of savings target`}
      className="h-2.5 overflow-hidden rounded-full bg-surface-muted"
    >
      <div
        className={`h-full rounded-full ${v.status === "reached" ? "bg-success" : "bg-accent"}`}
        style={{ width: `${Math.min(Math.max(percent, 1), 100)}%` }}
      />
    </div>
  );
}
