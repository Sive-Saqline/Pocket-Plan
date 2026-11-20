"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { AiComposer, AskAiButton } from "@/components/expenses/AiComposer";
import { CategoryPicker, inputClass, WalletPicker } from "@/components/expenses/Pickers";
import { CloseButton } from "@/components/ui/CloseButton";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { isoDate } from "@/lib/dates";
import { frequencies, type Category, type Frequency, type RecurringExpense, type Wallet } from "@/lib/ledger";
import { parseTaka } from "@/lib/money";

type Field = "description" | "amount" | "categoryId" | "accountId" | "date";

/** POST /ai/parse-recurring: only what the sentence said is set. */
interface RecurringSuggestion {
  amount: number | null;
  description: string;
  categoryId: string | null;
  accountId: string | null;
  frequency: Frequency | null;
  startDate: string | null;
}

const listOf = (items: string[]) =>
  items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;

export function RecurringSheet({
  open,
  template,
  categories,
  wallets,
  onClose,
  onSaved,
  onWalletCreated,
}: {
  open: boolean;
  /** Present when editing. */
  template: RecurringExpense | null;
  categories: Category[];
  wallets: Wallet[];
  onClose: () => void;
  onSaved: (message: string) => void;
  onWalletCreated: (wallet: Wallet) => void;
}) {
  const { request } = useAuth();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState<Frequency>("MONTHLY");
  const [date, setDate] = useState(isoDate());
  const [categoryId, setCategoryId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [session, setSession] = useState(0);
  // Ask AI (same as Add expense): closed until asked for; manual entry first.
  const [aiOpen, setAiOpen] = useState(false);
  const beforeAi = useRef<{
    description: string;
    amount: string;
    frequency: Frequency;
    date: string;
    categoryId: string;
    accountId: string;
  } | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      setDescription(template?.description ?? "");
      setAmount(template ? String(template.amount) : "");
      setFrequency(template?.frequency ?? "MONTHLY");
      setDate(template?.nextDueDate ?? isoDate());
      setCategoryId(template?.categoryId ?? "");
      setAccountId(template?.accountId ?? wallets[0]?.id ?? "");
      setIsActive(template?.isActive ?? true);
      setErrors({});
      setFormError(null);
      setBusy(false);
      setConfirmDelete(false);
      setAiOpen(false);
      beforeAi.current = null;
      setSession((s) => s + 1);
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open, template, wallets]);

  const clear = (field: Field) => setErrors((e) => ({ ...e, [field]: undefined }));

  /** Fills only what the sentence gave; the user checks it and saves. */
  async function askAi(sentence: string) {
    const s = await request<RecurringSuggestion>("/ai/parse-recurring", {
      method: "POST",
      body: { text: sentence, today: isoDate() },
    });
    // Undo goes back to before the first fill, even after several.
    beforeAi.current ??= { description, amount, frequency, date, categoryId, accountId };
    const filled: string[] = [];
    if (s.description) {
      setDescription(s.description);
      filled.push("name");
    }
    if (s.amount !== null) {
      setAmount(String(s.amount));
      filled.push("amount");
    }
    if (s.frequency) {
      setFrequency(s.frequency);
      filled.push("how often");
    }
    if (s.startDate) {
      setDate(s.startDate);
      filled.push("first due date");
    }
    if (s.categoryId) {
      setCategoryId(s.categoryId);
      filled.push("category");
    }
    if (s.accountId) {
      setAccountId(s.accountId);
      filled.push("wallet");
    }
    if (filled.length === 0) {
      throw new Error('Couldn\'t find a repeating expense in that. Try "Internet bill 1200 every month on the 5th".');
    }
    setErrors({});
    setFormError(null);
    return `Filled ${listOf(filled)}. Check it, then save.`;
  }

  function undoAi() {
    const b = beforeAi.current;
    if (!b) return;
    setDescription(b.description);
    setAmount(b.amount);
    setFrequency(b.frequency);
    setDate(b.date);
    setCategoryId(b.categoryId);
    setAccountId(b.accountId);
    beforeAi.current = null;
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const parsed = parseTaka(amount);
    const next: typeof errors = {};
    if (!description.trim()) next.description = "Name it, e.g. Internet bill";
    if (parsed === null) next.amount = "Enter an amount above ৳0, with at most 2 decimals";
    if (!categoryId) next.categoryId = "Pick a category";
    if (!accountId) next.accountId = "Pick a wallet";
    if (!date) next.date = "Pick a date";
    setErrors(next);
    setFormError(null);
    if (Object.keys(next).length || parsed === null) return;

    const common = { description: description.trim(), amount: parsed, frequency, categoryId, accountId };
    setBusy(true);
    try {
      if (template) {
        // Only send the due date if it changed: sending it re-anchors the schedule.
        await request(`/recurring-expenses/${template.id}?today=${isoDate()}`, {
          method: "PATCH",
          body: { ...common, isActive, ...(date !== template.nextDueDate && { nextDueDate: date }) },
        });
        onSaved(`${common.description} updated`);
      } else {
        await request(`/recurring-expenses?today=${isoDate()}`, {
          method: "POST",
          body: { ...common, startDate: date },
        });
        onSaved(`${common.description} will repeat ${frequency.toLowerCase()}`);
      }
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Couldn't save. Try again.");
      setBusy(false);
    }
  }

  async function remove() {
    if (!template) return;
    setBusy(true);
    try {
      await request(`/recurring-expenses/${template.id}`, { method: "DELETE" });
      onSaved(`${template.description} deleted`);
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
      aria-labelledby="recurring-sheet-title"
      className="m-auto mb-0 max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-surface p-0 text-text sm:mb-auto sm:rounded-2xl"
    >
      <form method="post" onSubmit={submit} noValidate className="flex flex-col gap-5 p-4 sm:p-6">
        <header className="flex items-center gap-2">
          <h2 id="recurring-sheet-title" className="flex-1 text-xl font-semibold">
            {template ? "Edit recurring expense" : "New recurring expense"}
          </h2>
          {!template && <AskAiButton open={aiOpen} onClick={() => setAiOpen((o) => !o)} />}
          <CloseButton onClick={onClose} />
        </header>

        {formError && (
          <p role="alert" className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2.5 text-sm">
            {formError}
          </p>
        )}

        {!template && aiOpen && (
          <AiComposer
            key={`ai-${session}`}
            placeholder="e.g. Internet bill 1200 every month on the 5th"
            onSend={askAi}
            onUndo={undoAi}
            onClose={() => setAiOpen(false)}
          />
        )}

        <div>
          <label htmlFor="rec-desc" className="mb-1.5 block text-sm font-medium">
            What is it?
          </label>
          <input
            id="rec-desc"
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              clear("description");
            }}
            placeholder="e.g. Internet bill"
            maxLength={120}
            autoFocus={!template}
            aria-invalid={!!errors.description}
            className={inputClass}
          />
          {errors.description && <p className="mt-1 text-sm text-danger">{errors.description}</p>}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="rec-amount" className="mb-1.5 block text-sm font-medium">
              Amount
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 grid place-items-center text-text-muted">৳</span>
              <input
                id="rec-amount"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  clear("amount");
                }}
                inputMode="decimal"
                placeholder="0"
                autoComplete="off"
                aria-invalid={!!errors.amount}
                className={`${inputClass} pl-7 font-mono tabular-nums`}
              />
            </div>
            {errors.amount && <p className="mt-1 text-sm text-danger">{errors.amount}</p>}
          </div>
          <div>
            <label htmlFor="rec-date" className="mb-1.5 block text-sm font-medium">
              {template ? "Next due" : "First due"}
            </label>
            <input
              id="rec-date"
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                clear("date");
              }}
              aria-invalid={!!errors.date}
              className={inputClass}
            />
            {errors.date && <p className="mt-1 text-sm text-danger">{errors.date}</p>}
          </div>
        </div>

        <fieldset>
          <legend className="mb-2 text-sm font-medium">Repeats</legend>
          <div role="radiogroup" aria-label="Repeats" className="grid grid-cols-4 gap-1 rounded-lg bg-surface-muted p-1">
            {frequencies.map((f) => (
              <button
                key={f.value}
                type="button"
                role="radio"
                aria-checked={frequency === f.value}
                onClick={() => setFrequency(f.value)}
                className={`h-10 rounded-md text-sm font-medium ${
                  frequency === f.value ? "bg-surface text-accent shadow-card" : "text-text-muted"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </fieldset>

        <CategoryPicker
          categories={categories}
          value={categoryId}
          onChange={(id) => {
            setCategoryId(id);
            clear("categoryId");
          }}
          error={errors.categoryId}
        />
        <WalletPicker
          key={`wallets-${session}`}
          wallets={wallets}
          value={accountId}
          onChange={(id) => {
            setAccountId(id);
            clear("accountId");
          }}
          onWalletCreated={onWalletCreated}
          error={errors.accountId}
        />

        {template && (
          <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border border-border px-3">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="size-5 accent-[var(--accent)]"
            />
            <span className="flex-1">
              <span className="block font-medium">Active</span>
              <span className="block text-sm text-text-muted">Paused expenses never show as due.</span>
            </span>
          </label>
        )}

        {confirmDelete ? (
          <div role="alertdialog" aria-label="Confirm delete" className="flex flex-col gap-3 rounded-lg border border-danger/40 bg-danger/10 p-3">
            <p className="text-sm font-medium">
              Delete this recurring expense? Expenses you already confirmed stay.
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setConfirmDelete(false)} className="h-11 flex-1 rounded-lg border border-border bg-surface font-medium">
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
            {template && (
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
              {template ? "Save changes" : "Save recurring expense"}
            </button>
          </div>
        )}
      </form>
    </dialog>
  );
}
