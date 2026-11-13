"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { CategoryPicker, inputClass, WalletPicker } from "@/components/expenses/Pickers";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { dayLabel, isoDate } from "@/lib/dates";
import { frequencyLabel, type Category, type Expense, type RecurringExpense, type Wallet } from "@/lib/ledger";
import { formatTaka, parseTaka } from "@/lib/money";

export interface ConfirmResult {
  confirmed: number;
  skipped: number;
  total: number;
}

/**
 * EXPERIENCE.md §4.7: due templates one at a time, pre-filled and editable.
 * Confirm saves the expense and advances the template; Skip changes nothing.
 * Closing part-way saves nothing for the item on screen.
 */
export function ConfirmRecurringSheet({
  queue,
  categories,
  wallets,
  onWalletCreated,
  onConfirmed,
  onDone,
}: {
  /** Due templates to review; null when closed. */
  queue: RecurringExpense[] | null;
  categories: Category[];
  wallets: Wallet[];
  onWalletCreated: (wallet: Wallet) => void;
  /** After each successful confirm, so the caller can refresh totals. */
  onConfirmed: (expense: Expense) => void;
  onDone: (result: ConfirmResult) => void;
}) {
  const { request } = useAuth();
  const dialogRef = useRef<HTMLDialogElement>(null);
  // finishing closes the dialog, whose close event would otherwise report twice
  const done = useRef(false);
  const [items, setItems] = useState<RecurringExpense[]>([]);
  const [index, setIndex] = useState(0);
  const [tally, setTally] = useState({ confirmed: 0, skipped: 0 });
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [description, setDescription] = useState("");
  const [expenseDate, setExpenseDate] = useState(isoDate());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const current = items[index];

  const load = (r: RecurringExpense) => {
    setAmount(String(r.amount));
    setCategoryId(r.categoryId);
    setAccountId(r.accountId);
    setDescription(r.description);
    // the bill is for its due date, but never record it in the future
    setExpenseDate(r.nextDueDate <= isoDate() ? r.nextDueDate : isoDate());
    setError(null);
    setBusy(false);
  };

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (queue && queue.length && !dialog.open) {
      setItems(queue);
      setIndex(0);
      setTally({ confirmed: 0, skipped: 0 });
      done.current = false;
      load(queue[0]);
      dialog.showModal();
    } else if (!queue && dialog.open) {
      dialog.close();
    }
  }, [queue]);

  const finish = (t = tally) => {
    if (done.current) return;
    done.current = true;
    onDone({ ...t, total: items.length });
  };

  const advance = (t: typeof tally) => {
    setTally(t);
    if (index + 1 < items.length) {
      setIndex(index + 1);
      load(items[index + 1]);
    } else {
      finish(t);
    }
  };

  async function confirm(event: FormEvent) {
    event.preventDefault();
    if (!current) return;
    const parsed = parseTaka(amount);
    if (parsed === null) return setError("Enter an amount above ৳0, with at most 2 decimals");
    if (!expenseDate) return setError("Pick a date");
    setBusy(true);
    try {
      const res = await request<{ expense: Expense; recurring: RecurringExpense }>(
        `/recurring-expenses/${current.id}/confirm`,
        {
          method: "POST",
          body: { amount: parsed, categoryId, accountId, description: description.trim(), expenseDate, today: isoDate() },
        },
      );
      onConfirmed(res.expense);
      const t = { ...tally, confirmed: tally.confirmed + 1 };
      if (res.recurring.due) {
        // missed occurrences: the same template comes back for its next date
        setTally(t);
        setItems((list) => list.map((r, i) => (i === index ? res.recurring : r)));
        load(res.recurring);
      } else {
        advance(t);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't confirm. Try again.");
      setBusy(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={() => finish()}
      aria-labelledby="confirm-recurring-title"
      className="m-auto mb-0 max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-surface p-0 text-text sm:mb-auto sm:rounded-2xl"
    >
      {current && (
        <form method="post" onSubmit={confirm} noValidate className="flex flex-col gap-5 p-4 sm:p-6">
          <header className="flex items-start gap-3">
            <div className="flex-1">
              <p className="text-sm font-medium text-text-muted">
                Due recurring expense · {index + 1} of {items.length}
              </p>
              <h2 id="confirm-recurring-title" className="text-xl font-semibold">
                {current.description}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              aria-label="Close"
              className="grid size-11 place-items-center rounded-lg text-xl text-text-muted hover:bg-surface-muted"
            >
              ×
            </button>
          </header>

          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-surface-muted px-3 py-2 text-sm">
            <span>
              <span aria-hidden>🔁 </span>
              {frequencyLabel(current.frequency)}
            </span>
            <span>Due {dayLabel(current.nextDueDate)}</span>
            {current.dueCount > 1 && (
              <span className="font-medium text-danger">
                <span aria-hidden>⚠ </span>
                {current.dueCount} occurrences waiting
              </span>
            )}
          </p>

          {error && (
            <p role="alert" className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2.5 text-sm">
              {error}
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="rc-amount" className="mb-1.5 block text-sm font-medium">
                Amount
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3 grid place-items-center text-text-muted">৳</span>
                <input
                  id="rc-amount"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    setError(null);
                  }}
                  inputMode="decimal"
                  autoComplete="off"
                  className={`${inputClass} pl-7 font-mono tabular-nums`}
                />
              </div>
            </div>
            <div>
              <label htmlFor="rc-date" className="mb-1.5 block text-sm font-medium">
                Date
              </label>
              <input
                id="rc-date"
                type="date"
                value={expenseDate}
                max={isoDate()}
                onChange={(e) => setExpenseDate(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <CategoryPicker categories={categories} value={categoryId} onChange={setCategoryId} />
          <WalletPicker
            key={`${current.id}-${index}`}
            wallets={wallets}
            value={accountId}
            onChange={setAccountId}
            onWalletCreated={onWalletCreated}
          />

          <div>
            <label htmlFor="rc-desc" className="mb-1.5 block text-sm font-medium">
              Description
            </label>
            <input
              id="rc-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={120}
              className={inputClass}
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => advance({ ...tally, skipped: tally.skipped + 1 })}
              disabled={busy}
              className="h-13 flex-1 rounded-lg border border-border font-semibold hover:bg-surface-muted disabled:opacity-60"
            >
              Skip
            </button>
            <button
              type="submit"
              disabled={busy}
              className="flex h-13 flex-[2] items-center justify-center gap-2 rounded-lg bg-accent font-semibold text-text-inverse hover:bg-accent-hover active:bg-accent-pressed disabled:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {busy && <span aria-hidden className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
              Confirm {parseTaka(amount) !== null ? formatTaka(parseTaka(amount)!) : ""}
            </button>
          </div>
        </form>
      )}
    </dialog>
  );
}
