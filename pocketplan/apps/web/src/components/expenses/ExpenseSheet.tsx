"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { isoDate } from "@/lib/dates";
import { type BudgetView, type Category, type Expense, type ExpenseInput, type Wallet } from "@/lib/ledger";
import { parseTaka } from "@/lib/money";
import { useApiData } from "@/lib/use-api-data";
import { CategoryPicker, inputClass, WalletPicker } from "./Pickers";

type Field = "amount" | "categoryId" | "accountId" | "expenseDate";


export function ExpenseSheet({
  open,
  expense,
  categories,
  wallets,
  onClose,
  onSaved,
  onDeleted,
  onWalletCreated,
}: {
  open: boolean;
  /** Present when editing. */
  expense: Expense | null;
  categories: Category[];
  wallets: Wallet[];
  onClose: () => void;
  onSaved: (expense: Expense, created: boolean) => void;
  onDeleted: (expense: Expense) => void;
  onWalletCreated: (wallet: Wallet) => void;
}) {
  const { request } = useAuth();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [expenseDate, setExpenseDate] = useState(isoDate());
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  // remounts the wallet picker each time the sheet opens, closing any half-done "+ Add"
  const [session, setSession] = useState(0);

  const budgetMonth = expenseDate.slice(0, 7);
  const budgets = useApiData<BudgetView>(open && budgetMonth ? `/budgets?month=${budgetMonth}` : null);
  const budgetNote = projectedBudget(budgets.data, budgetMonth, categoryId, parseTaka(amount), expense);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      setAmount(expense ? String(expense.amount) : "");
      setCategoryId(expense?.categoryId ?? "");
      setAccountId(expense?.accountId ?? wallets[0]?.id ?? "");
      setExpenseDate(expense?.expenseDate ?? isoDate());
      setDescription(expense?.description ?? "");
      setErrors({});
      setFormError(null);
      setBusy(false);
      setConfirmDelete(false);
      setSession((s) => s + 1);
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open, expense, wallets]);

  const clear = (field: Field) => setErrors((e) => ({ ...e, [field]: undefined }));

  async function submit(event: FormEvent) {
    event.preventDefault();
    const parsed = parseTaka(amount);
    const next: typeof errors = {};
    if (parsed === null) next.amount = "Enter an amount above ৳0, with at most 2 decimals";
    if (!categoryId) next.categoryId = "Pick a category";
    if (!accountId) next.accountId = "Pick a wallet";
    if (!expenseDate) next.expenseDate = "Pick a date";
    setErrors(next);
    setFormError(null);
    if (Object.keys(next).length || parsed === null) return;

    const body: ExpenseInput = { amount: parsed, categoryId, accountId, expenseDate, description: description.trim() };
    setBusy(true);
    try {
      const saved = expense
        ? await request<Expense>(`/expenses/${expense.id}`, { method: "PATCH", body })
        : await request<Expense>("/expenses", { method: "POST", body });
      onSaved(saved, !expense);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Couldn't save. Try again.");
      setBusy(false);
    }
  }

  async function remove() {
    if (!expense) return;
    setBusy(true);
    try {
      await request(`/expenses/${expense.id}`, { method: "DELETE" });
      onDeleted(expense);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Couldn't delete. Try again.");
      setBusy(false);
      setConfirmDelete(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      aria-labelledby="expense-sheet-title"
      className="m-auto mb-0 max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-surface p-0 text-text sm:mb-auto sm:rounded-2xl"
    >
      <form method="post" onSubmit={submit} noValidate className="flex flex-col gap-5 p-4 sm:p-6">
        <header className="flex items-center justify-between">
          <h2 id="expense-sheet-title" className="text-xl font-semibold">
            {expense ? "Edit expense" : "Add expense"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid size-11 place-items-center rounded-lg text-xl text-text-muted hover:bg-surface-muted"
          >
            ×
          </button>
        </header>

        {formError && (
          <p role="alert" className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2.5 text-sm">
            {formError}
          </p>
        )}

        <div>
          <label htmlFor="exp-amount" className="sr-only">
            Amount in taka
          </label>
          <div className="flex items-baseline justify-center gap-1">
            <span aria-hidden className="text-3xl text-text-muted">
              ৳
            </span>
            <input
              id="exp-amount"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                clear("amount");
              }}
              inputMode="decimal"
              placeholder="0"
              autoComplete="off"
              autoFocus={!expense}
              aria-invalid={!!errors.amount}
              aria-describedby={errors.amount ? "exp-amount-error" : undefined}
              className="w-48 border-b-2 border-border bg-transparent text-center font-mono text-4xl font-semibold tabular-nums outline-none focus:border-accent aria-[invalid=true]:border-danger"
            />
          </div>
          {errors.amount && (
            <p id="exp-amount-error" className="mt-1 text-center text-sm text-danger">
              {errors.amount}
            </p>
          )}
        </div>

        <CategoryPicker
          categories={categories}
          value={categoryId}
          onChange={(id) => {
            setCategoryId(id);
            clear("categoryId");
          }}
          error={errors.categoryId}
        >
          {budgetNote && (
            <p
              role="status"
              className={`mt-2 rounded-lg px-3 py-2 text-sm font-medium ${
                budgetNote.over ? "bg-danger/10 text-danger" : "bg-warning/15"
              }`}
            >
              <span aria-hidden>{budgetNote.over ? "⚠ " : "● "}</span>
              This puts {budgetNote.name} at {budgetNote.percent}% of budget.
            </p>
          )}
        </CategoryPicker>

        <WalletPicker
          key={session}
          wallets={wallets}
          value={accountId}
          onChange={(id) => {
            setAccountId(id);
            clear("accountId");
          }}
          onWalletCreated={onWalletCreated}
          error={errors.accountId}
        />

        <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
          <div>
            <label htmlFor="exp-date" className="mb-1.5 block text-sm font-medium">
              Date
            </label>
            <input
              id="exp-date"
              type="date"
              value={expenseDate}
              max={isoDate()}
              onChange={(e) => {
                setExpenseDate(e.target.value);
                clear("expenseDate");
              }}
              aria-invalid={!!errors.expenseDate}
              className={inputClass}
            />
            {errors.expenseDate && <p className="mt-1 text-sm text-danger">{errors.expenseDate}</p>}
          </div>
          <div>
            <label htmlFor="exp-desc" className="mb-1.5 block text-sm font-medium">
              Description <span className="font-normal text-text-muted">(optional)</span>
            </label>
            <input
              id="exp-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Lunch at canteen"
              maxLength={120}
              className={inputClass}
            />
          </div>
        </div>

        {confirmDelete ? (
          <div role="alertdialog" aria-label="Confirm delete" className="flex flex-col gap-3 rounded-lg border border-danger/40 bg-danger/10 p-3">
            <p className="text-sm font-medium">Delete this expense? This can&apos;t be undone.</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="h-11 flex-1 rounded-lg border border-border bg-surface font-medium"
              >
                Keep it
              </button>
              <button
                type="button"
                onClick={remove}
                disabled={busy}
                className="h-11 flex-1 rounded-lg bg-danger font-semibold text-white disabled:opacity-70"
              >
                Delete
              </button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            {expense && (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="h-13 rounded-lg px-4 font-semibold text-danger hover:bg-danger/10"
              >
                Delete
              </button>
            )}
            <button
              type="submit"
              disabled={busy}
              className="flex h-13 flex-1 items-center justify-center gap-2 rounded-lg bg-accent font-semibold text-text-inverse hover:bg-accent-hover active:bg-accent-pressed disabled:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {busy && <span aria-hidden className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
              {expense ? "Save changes" : "Save expense"}
            </button>
          </div>
        )}
      </form>
    </dialog>
  );
}

/**
 * EXPERIENCE.md §5.6: tell the user, without judgement, when this expense takes a
 * category to 80%+ of its budget. When editing, the expense's old amount isn't counted twice.
 */
function projectedBudget(
  view: BudgetView | null,
  month: string,
  categoryId: string,
  amount: number | null,
  editing: Expense | null,
) {
  if (!view || view.month !== month || !categoryId || amount === null) return null;
  const line = view.lines.find((l) => l.categoryId === categoryId);
  if (!line?.planned) return null;
  const paisa = (n: number) => Math.round(n * 100);
  const already =
    editing && editing.categoryId === categoryId && editing.expenseDate.startsWith(month) ? paisa(editing.amount) : 0;
  const projected = paisa(line.spent) - already + paisa(amount);
  const percent = Math.floor((projected * 100) / paisa(line.planned));
  if (percent < 80) return null;
  return { name: line.name, percent, over: projected >= paisa(line.planned) };
}
