"use client";

import { ArrowRight, BellRing } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import type { RecurringExpense } from "@/lib/ledger";
import { formatTaka } from "@/lib/money";

const DISMISS_KEY = "pocketplan.recurring-banner-dismissed";

/**
 * EXPERIENCE.md §4.6: one banner however many are due. "Not now" hides it for
 * this browser session only and never marks anything as confirmed.
 */
export function DueRecurringBanner({ due, onReview }: { due: RecurringExpense[]; onReview: () => void }) {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      setDismissed(sessionStorage.getItem(DISMISS_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  if (dismissed || due.length === 0) return null;
  const count = due.reduce((n, r) => n + Math.max(r.dueCount, 1), 0);

  return (
    <section
      aria-label="Recurring expenses due"
      className="flex flex-col gap-3 rounded-xl border border-warning/60 bg-warning/15 p-4 sm:flex-row sm:items-center"
    >
      <div className="flex flex-1 gap-3">
        <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-warning text-[#0f1b1f]">
          <BellRing size={18} />
        </span>
        <div className="min-w-0">
          <p className="font-semibold">
            {count === 1 ? "1 recurring expense is due" : `${count} recurring expenses are due`}
          </p>
          <p className="truncate text-sm text-text-muted">
            {due.length === 1
              ? `${due[0].description} — ${formatTaka(due[0].amount)}`
              : due.map((r) => r.description).join(", ")}
          </p>
        </div>
      </div>
      <div className="flex gap-2 sm:shrink-0">
        <button
          type="button"
          onClick={() => {
            setDismissed(true);
            try {
              sessionStorage.setItem(DISMISS_KEY, "1");
            } catch {
              // storage blocked: hidden until reload
            }
          }}
          className="h-11 flex-1 rounded-lg px-4 text-sm font-medium text-text-muted hover:bg-surface/60 sm:flex-none"
        >
          Not now
        </button>
        <Button onClick={onReview} className="flex-1 text-sm sm:flex-none">
          Review
          <ArrowRight aria-hidden size={16} />
        </Button>
      </div>
    </section>
  );
}
