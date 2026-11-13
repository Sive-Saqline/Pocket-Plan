"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { CloseButton } from "@/components/ui/CloseButton";
import { CategoryBadge } from "@/components/ui/icons";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { monthLabel } from "@/lib/dates";
import type { BudgetLine } from "@/lib/ledger";
import { formatTaka, parseTaka } from "@/lib/money";
import { BudgetBar, budgetStatusFor } from "./BudgetBar";

export function BudgetSheet({
  line,
  month,
  onClose,
  onSaved,
}: {
  /** The category being budgeted; null when closed. */
  line: BudgetLine | null;
  month: string;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const { request } = useAuth();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (line && !dialog.open) {
      setAmount(line.planned ? String(line.planned) : "");
      setError(null);
      setBusy(false);
      dialog.showModal();
    } else if (!line && dialog.open) {
      dialog.close();
    }
  }, [line]);

  const parsed = parseTaka(amount);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!line) return;
    if (parsed === null) return setError("Enter an amount above ৳0, with at most 2 decimals");
    setBusy(true);
    try {
      await request("/budgets", { method: "PUT", body: { month, categoryId: line.categoryId, plannedAmount: parsed } });
      onSaved(`${line.name} budget set to ${formatTaka(parsed)}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save. Try again.");
      setBusy(false);
    }
  }

  async function remove() {
    if (!line) return;
    setBusy(true);
    try {
      await request(`/budgets/${line.categoryId}?month=${month}`, { method: "DELETE" });
      onSaved(`${line.name} budget removed`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't remove. Try again.");
      setBusy(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      aria-labelledby="budget-sheet-title"
      className="m-auto mb-0 w-full max-w-lg rounded-t-2xl bg-surface p-0 text-text sm:mb-auto sm:rounded-2xl"
    >
      {line && (
        <form method="post" onSubmit={save} noValidate className="flex flex-col gap-5 p-4 sm:p-6">
          <header className="flex items-center gap-3">
            <CategoryBadge icon={line.icon} className="size-11" />
            <div className="flex-1">
              <h2 id="budget-sheet-title" className="text-xl font-semibold">
                {line.name} budget
              </h2>
              <p className="text-sm text-text-muted">{monthLabel(month)}</p>
            </div>
            <CloseButton onClick={onClose} />
          </header>

          <div>
            <label htmlFor="budget-amount" className="mb-1.5 block text-sm font-medium">
              Monthly limit
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 grid place-items-center text-text-muted">৳</span>
              <input
                id="budget-amount"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setError(null);
                }}
                inputMode="decimal"
                placeholder="e.g. 6000"
                autoComplete="off"
                autoFocus
                aria-invalid={!!error}
                aria-describedby={error ? "budget-amount-error" : "budget-amount-hint"}
                className="h-12 w-full rounded-lg border border-border bg-surface pr-3 pl-7 font-mono text-lg tabular-nums focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent aria-[invalid=true]:border-danger"
              />
            </div>
            {error ? (
              <p id="budget-amount-error" className="mt-1 text-sm text-danger">
                {error}
              </p>
            ) : (
              <p id="budget-amount-hint" className="mt-1 text-sm text-text-muted">
                Spent so far this month: {formatTaka(line.spent)}
              </p>
            )}
          </div>

          {parsed !== null && (
            <div className="rounded-lg bg-surface-muted p-3">
              <p className="mb-2 text-sm">
                With this limit you&apos;ve used{" "}
                <span className="font-semibold">{Math.floor((line.spent * 100) / parsed)}%</span>
              </p>
              <BudgetBar spent={line.spent} planned={parsed} status={budgetStatusFor(line.spent, parsed)} />
            </div>
          )}

          <div className="flex gap-2">
            {line.planned !== null && (
              <button
                type="button"
                onClick={remove}
                disabled={busy}
                className="h-13 rounded-lg px-4 font-semibold text-danger hover:bg-danger/10 disabled:opacity-60"
              >
                Remove
              </button>
            )}
            <button
              type="submit"
              disabled={busy}
              className="h-13 flex-1 rounded-lg bg-accent font-semibold text-text-inverse hover:bg-accent-hover active:bg-accent-pressed disabled:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {line.planned !== null ? "Save budget" : "Set budget"}
            </button>
          </div>
        </form>
      )}
    </dialog>
  );
}
