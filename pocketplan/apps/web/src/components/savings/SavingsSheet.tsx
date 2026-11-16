"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { PiggyBank } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { CloseButton } from "@/components/ui/CloseButton";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { monthLabel } from "@/lib/dates";
import type { SavingsView } from "@/lib/ledger";
import { formatTaka, parseTaka } from "@/lib/money";
import { SavingsBar } from "./SavingsCard";

/** Set, change or remove the savings target for one month. */
export function SavingsSheet({
  savings,
  onClose,
  onSaved,
}: {
  /** The month being edited; null when closed. */
  savings: SavingsView | null;
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
    if (savings && !dialog.open) {
      setAmount(savings.target ? String(savings.target) : "");
      setError(null);
      setBusy(false);
      dialog.showModal();
    } else if (!savings && dialog.open) {
      dialog.close();
    }
  }, [savings]);

  const parsed = parseTaka(amount);
  const month = savings ? monthLabel(savings.month, { short: true }) : "";

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!savings) return;
    if (parsed === null) return setError("Enter an amount above ৳0, with at most 2 decimals");
    setBusy(true);
    try {
      await request("/savings-goals", { method: "PUT", body: { month: savings.month, targetAmount: parsed } });
      onSaved(`${month} savings target set to ${formatTaka(parsed)}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save. Try again.");
      setBusy(false);
    }
  }

  async function remove() {
    if (!savings) return;
    setBusy(true);
    try {
      await request(`/savings-goals?month=${savings.month}`, { method: "DELETE" });
      onSaved(`${month} savings target removed`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't remove. Try again.");
      setBusy(false);
    }
  }

  const preview =
    savings && parsed !== null
      ? {
          percent: Math.floor((Math.round(savings.saved * 100) * 100) / Math.round(parsed * 100)),
          status: savings.saved >= parsed ? ("reached" as const) : ("saving" as const),
        }
      : null;

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      aria-labelledby="savings-sheet-title"
      className="m-auto mb-0 w-full max-w-lg rounded-t-2xl bg-surface p-0 text-text sm:mb-auto sm:rounded-2xl"
    >
      {savings && (
        <form method="post" onSubmit={save} noValidate className="flex flex-col gap-5 p-4 sm:p-6">
          <header className="flex items-center gap-3">
            <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-full bg-accent/10 text-accent">
              <PiggyBank size={22} strokeWidth={1.75} />
            </span>
            <div className="flex-1">
              <h2 id="savings-sheet-title" className="text-xl font-semibold">
                Savings target
              </h2>
              <p className="text-sm text-text-muted">{monthLabel(savings.month)}</p>
            </div>
            <CloseButton onClick={onClose} />
          </header>

          <div>
            <label htmlFor="savings-amount" className="mb-1.5 block text-sm font-medium">
              How much do you want to save?
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 grid place-items-center text-text-muted">৳</span>
              <input
                id="savings-amount"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setError(null);
                }}
                inputMode="decimal"
                placeholder="e.g. 5000"
                autoComplete="off"
                autoFocus
                aria-invalid={!!error}
                aria-describedby={error ? "savings-amount-error" : "savings-amount-hint"}
                className="h-12 w-full rounded-lg border border-border bg-surface pr-3 pl-7 font-mono text-lg tabular-nums focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent aria-[invalid=true]:border-danger"
              />
            </div>
            {error ? (
              <p id="savings-amount-error" className="mt-1 text-sm text-danger">
                {error}
              </p>
            ) : (
              <p id="savings-amount-hint" className="mt-1 text-sm text-text-muted">
                Saved so far: {formatTaka(savings.saved)}. Money you log as a {savings.category?.name ?? "Savings"}{" "}
                expense counts towards it.
              </p>
            )}
          </div>

          {preview && (
            <div className="rounded-lg bg-surface-muted p-3">
              <p className="mb-2 text-sm">
                With this target you&apos;re <span className="font-semibold">{preview.percent}%</span> of the way there
              </p>
              <SavingsBar view={preview} />
            </div>
          )}

          <div className="flex gap-2">
            {savings.target !== null && (
              <Button variant="ghost" className="text-danger hover:text-danger" onClick={remove} disabled={busy}>
                Remove
              </Button>
            )}
            <Button type="submit" className="flex-1" disabled={busy}>
              {busy ? "Saving…" : savings.target !== null ? "Save target" : "Set target"}
            </Button>
          </div>
        </form>
      )}
    </dialog>
  );
}
