"use client";

import { Check, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { inputClass } from "@/components/expenses/Pickers";
import { Button } from "@/components/ui/Button";
import { CategoryIconGrid } from "@/components/ui/CategoryIconGrid";
import { ConfirmDelete } from "@/components/ui/ConfirmDelete";
import { CATEGORY_ICON_OPTIONS } from "@/components/ui/icons";
import { FormError, Sheet } from "@/components/ui/Sheet";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { isoDate } from "@/lib/dates";
import {
  previewSplit,
  splitTypes,
  type GroupDetail,
  type GroupExpense,
  type GroupExpenseInput,
  type SplitType,
} from "@/lib/group";
import { formatTaka, parseTaka } from "@/lib/money";

const categoryLabel = (key: string) => CATEGORY_ICON_OPTIONS.find((o) => o.key === key)?.label ?? "Other";

/** "12.5" -> 12.5; null when empty or not a positive number with ≤2 decimals. */
function parseValue(input: string | undefined): number | null {
  const t = (input ?? "").replace(/,/g, "").trim();
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return null;
  const v = Number(t);
  return v > 0 ? v : null;
}

/**
 * Add or edit a shared expense (PRD v4 §6.12): who paid, who it's split
 * between, and how (equally, exact amounts, percentages or shares).
 */
export function GroupExpenseSheet({
  open,
  group,
  expense,
  onClose,
  onDone,
}: {
  open: boolean;
  group: GroupDetail;
  /** null = new expense */
  expense: GroupExpense | null;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const { request, state } = useAuth();
  const me = state.user?.id ?? "";
  const active = useMemo(() => group.members.filter((m) => m.active), [group.members]);
  const nameOf = (id: string) => group.members.find((m) => m.userId === id)?.name ?? "Former member";

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(isoDate());
  const [category, setCategory] = useState("food");
  const [paidBy, setPaidBy] = useState(me);
  const [splitType, setSplitType] = useState<SplitType>("EQUAL");
  const [ticked, setTicked] = useState<string[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Someone in this expense has left: it stays as it is (the API refuses changes).
  const involvesFormer =
    !!expense &&
    [expense.paidBy, ...expense.participants.map((p) => p.userId)].some(
      (id) => !group.members.some((m) => m.userId === id && m.active),
    );
  const readOnly = !!expense && (!expense.canEdit || involvesFormer);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setFormError(null);
    setBusy(false);
    setConfirmDelete(false);
    if (expense) {
      setDescription(expense.description);
      setAmount(String(expense.amount));
      setDate(expense.expenseDate);
      setCategory(expense.category);
      setPaidBy(expense.paidBy);
      setSplitType(expense.splitType);
      setTicked(expense.participants.map((p) => p.userId));
      setValues(
        Object.fromEntries(expense.participants.map((p) => [p.userId, p.value === null ? "" : String(p.value)])),
      );
    } else {
      setDescription("");
      setAmount("");
      setDate(isoDate());
      setCategory("food");
      setPaidBy(active.some((m) => m.userId === me) ? me : (active[0]?.userId ?? ""));
      setSplitType("EQUAL");
      setTicked(active.map((m) => m.userId));
      setValues({});
    }
  }, [open, expense, active, me]);

  const parsedAmount = parseTaka(amount);
  // Member order keeps leftover-paisa rounding predictable.
  const people = (readOnly && expense
    ? expense.participants.map((p) => p.userId)
    : active.map((m) => m.userId).filter((id) => ticked.includes(id))
  ).map((userId) => ({ userId, value: splitType === "EQUAL" ? null : parseValue(values[userId]) }));
  const preview = previewSplit(parsedAmount, splitType, people);

  function changeType(type: SplitType) {
    setSplitType(type);
    setErrors((e) => ({ ...e, split: "" }));
    // Shares start at 1 each; amounts and percentages are typed fresh.
    setValues(type === "SHARES" ? Object.fromEntries(active.map((m) => [m.userId, "1"])) : {});
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (!description.trim()) next.description = "Add a short description, e.g. Groceries at Shwapno";
    if (parsedAmount === null) next.amount = "Enter an amount above ৳0, with at most 2 decimals";
    if (!date) next.date = "Pick a date";
    if (preview.problem) next.split = preview.problem;
    setErrors(next);
    if (Object.keys(next).length > 0 || parsedAmount === null) return;

    const body: GroupExpenseInput = {
      description: description.trim(),
      amount: parsedAmount,
      expenseDate: date,
      category,
      paidBy,
      splitType,
      participants: people.map((p) => (splitType === "EQUAL" ? { userId: p.userId } : { userId: p.userId, value: p.value! })),
    };
    setBusy(true);
    setFormError(null);
    try {
      if (expense) {
        await request(`/groups/${group.id}/expenses/${expense.id}`, { method: "PATCH", body });
        onDone(`Updated ${formatTaka(body.amount)} · ${body.description}`);
      } else {
        await request(`/groups/${group.id}/expenses`, { method: "POST", body });
        onDone(`Added ${formatTaka(body.amount)} · ${body.description}`);
      }
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Couldn't save. Try again.");
      setBusy(false);
    }
  }

  async function remove() {
    if (!expense) return;
    setBusy(true);
    try {
      await request(`/groups/${group.id}/expenses/${expense.id}`, { method: "DELETE" });
      onDone(`Deleted ${formatTaka(expense.amount)} · ${expense.description}`);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Couldn't delete. Try again.");
      setConfirmDelete(false);
      setBusy(false);
    }
  }

  const title = !expense ? "Add shared expense" : readOnly ? "Shared expense" : "Edit shared expense";

  return (
    <Sheet open={open} onClose={onClose} title={title} wide>
      <form onSubmit={submit} noValidate className="flex flex-col gap-5">
        <FormError message={formError} />
        {expense && readOnly && (
          <p className="rounded-lg bg-surface-muted px-3 py-2.5 text-sm text-text-muted">
            {involvesFormer
              ? "Someone in this expense has left the group, so it's kept as it is."
              : `Only ${nameOf(expense.recordedBy)} (who added it) or ${nameOf(expense.paidBy)} (who paid) can change it.`}
          </p>
        )}

        <fieldset disabled={readOnly || busy} className="flex flex-col gap-5">
          <Field id="gx-desc" label="Description" error={errors.description}>
            <input
              id="gx-desc"
              value={description}
              maxLength={120}
              placeholder="e.g. Groceries at Shwapno"
              onChange={(e) => setDescription(e.target.value)}
              aria-invalid={!!errors.description}
              className={inputClass}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field id="gx-amount" label="Amount" error={errors.amount}>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3 grid place-items-center text-text-muted">৳</span>
                <input
                  id="gx-amount"
                  value={amount}
                  inputMode="decimal"
                  placeholder="0"
                  onChange={(e) => setAmount(e.target.value)}
                  aria-invalid={!!errors.amount}
                  className={`${inputClass} pl-7 font-mono tabular-nums`}
                />
              </div>
            </Field>
            <Field id="gx-date" label="Date" error={errors.date}>
              <input id="gx-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
            </Field>
            <Field id="gx-payer" label="Paid by">
              <select id="gx-payer" value={paidBy} onChange={(e) => setPaidBy(e.target.value)} className={inputClass}>
                {(readOnly ? group.members : active).map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.userId === me ? `${m.name} (you)` : m.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <fieldset>
            <legend className="mb-2 text-sm font-medium">
              Category: <span className="text-text-muted">{categoryLabel(category)}</span>
            </legend>
            <CategoryIconGrid value={category} onChange={setCategory} compact />
          </fieldset>

          <fieldset>
            <legend className="mb-2 text-sm font-medium">Split</legend>
            <div role="radiogroup" aria-label="How to split" className="grid grid-cols-4 gap-1 rounded-lg bg-surface-muted p-1">
              {splitTypes.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  role="radio"
                  aria-checked={splitType === s.value}
                  onClick={() => changeType(s.value)}
                  className={`h-10 rounded-md text-sm font-medium ${
                    splitType === s.value ? "bg-surface text-accent shadow-card" : "text-text-muted"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-sm text-text-muted">{splitTypes.find((s) => s.value === splitType)?.hint}</p>

            <ul className="mt-3 divide-y divide-border rounded-lg border border-border">
              {(readOnly && expense
                ? group.members.filter((m) => expense.participants.some((p) => p.userId === m.userId))
                : active
              ).map((m) => {
                const on = people.some((p) => p.userId === m.userId);
                const share = preview.shares.get(m.userId);
                return (
                  <li key={m.userId} className="flex min-h-14 items-center gap-3 px-3 py-2">
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={on}
                      aria-label={`Include ${m.name}`}
                      onClick={() => setTicked((t) => (on ? t.filter((id) => id !== m.userId) : [...t, m.userId]))}
                      className={`grid size-6 shrink-0 place-items-center rounded-md border ${
                        on ? "border-accent bg-accent text-text-inverse" : "border-border bg-surface"
                      }`}
                    >
                      {on && <Check aria-hidden size={16} />}
                    </button>
                    <UserAvatar name={m.name} avatarUrl={m.avatarUrl} className="size-8 text-xs" />
                    <span className="min-w-0 flex-1 truncate">{m.userId === me ? `${m.name} (you)` : m.name}</span>
                    {on && splitType !== "EQUAL" && (
                      <span className="relative w-28">
                        {splitType === "EXACT" && (
                          <span className="pointer-events-none absolute inset-y-0 left-2 grid place-items-center text-sm text-text-muted">৳</span>
                        )}
                        <input
                          value={values[m.userId] ?? ""}
                          inputMode="decimal"
                          aria-label={`${m.name}: ${splitType === "EXACT" ? "amount" : splitType === "PERCENTAGE" ? "percent" : "shares"}`}
                          onChange={(e) => setValues((v) => ({ ...v, [m.userId]: e.target.value }))}
                          className={`h-10 w-full rounded-lg border border-border bg-surface pr-7 text-right font-mono tabular-nums focus-visible:outline-2 focus-visible:outline-accent ${
                            splitType === "EXACT" ? "pl-6" : "pl-2"
                          }`}
                        />
                        {splitType !== "EXACT" && (
                          <span className="pointer-events-none absolute inset-y-0 right-2 grid place-items-center text-sm text-text-muted">
                            {splitType === "PERCENTAGE" ? "%" : "×"}
                          </span>
                        )}
                      </span>
                    )}
                    <span className="w-24 text-right font-mono text-sm tabular-nums text-text-muted">
                      {on && share !== undefined ? formatTaka(share) : ""}
                    </span>
                  </li>
                );
              })}
            </ul>
            <p
              role="status"
              className={`mt-2 text-sm ${errors.split || (preview.problem && parsedAmount !== null) ? "text-danger" : "text-text-muted"}`}
            >
              {errors.split ||
                preview.problem ||
                (parsedAmount !== null ? `Adds up to ${formatTaka(parsedAmount)} across ${people.length} ${people.length === 1 ? "person" : "people"}.` : "")}
            </p>
          </fieldset>
        </fieldset>

        {confirmDelete ? (
          <ConfirmDelete
            message={`Delete ${expense?.description}? Everyone's balance in ${group.name} updates straight away.`}
            busy={busy}
            onCancel={() => setConfirmDelete(false)}
            onConfirm={remove}
          />
        ) : (
          <div className="flex gap-2">
            {expense?.canDelete && !involvesFormer && (
              <Button variant="ghost" className="text-danger hover:text-danger" onClick={() => setConfirmDelete(true)} disabled={busy}>
                <Trash2 aria-hidden size={18} />
                Delete
              </Button>
            )}
            {!readOnly && (
              <Button type="submit" className="flex-1" disabled={busy}>
                {busy ? "Saving…" : expense ? "Save changes" : "Add expense"}
              </Button>
            )}
          </div>
        )}
      </form>
    </Sheet>
  );
}

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
        {label}
      </label>
      {children}
      {error && <p className="mt-1 text-sm text-danger">{error}</p>}
    </div>
  );
}
