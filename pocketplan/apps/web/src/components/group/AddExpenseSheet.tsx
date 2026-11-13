"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import type { GroupExpense, Member } from "@/lib/group";
import { formatTaka, parseTaka } from "@/lib/money";

type SplitMode = "everyone" | "choose" | "me";

const splitModes: { value: SplitMode; label: string }[] = [
  { value: "everyone", label: "Everyone" },
  { value: "choose", label: "Choose people" },
  { value: "me", label: "Just the payer" },
];

export function AddExpenseSheet({
  open,
  members,
  onClose,
  onSave,
}: {
  open: boolean;
  members: Member[];
  onClose: () => void;
  onSave: (expense: Omit<GroupExpense, "id">) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [paidBy, setPaidBy] = useState(members[0]?.id ?? "");
  const [mode, setMode] = useState<SplitMode>("everyone");
  const [chosen, setChosen] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      setDescription("");
      setAmount("");
      setPaidBy(members[0]?.id ?? "");
      setMode("everyone");
      setChosen(members.map((m) => m.id));
      setErrors({});
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open, members]);

  const clearError = (field: string) =>
    setErrors((e) => {
      if (!(field in e)) return e;
      return Object.fromEntries(Object.entries(e).filter(([key]) => key !== field));
    });

  const participants =
    mode === "everyone" ? members.map((m) => m.id) : mode === "me" ? [paidBy] : chosen;
  const parsed = parseTaka(amount);
  const perHead = parsed && participants.length ? parsed / participants.length : null;

  function submit(event: FormEvent) {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (!description.trim()) next.description = "Add a short description.";
    if (parsed === null) next.amount = "Enter an amount above ৳0, with at most 2 decimals.";
    if (participants.length === 0) next.split = "Pick at least one person.";
    setErrors(next);
    if (Object.keys(next).length > 0 || parsed === null) return;
    // keep member order so leftover-paisa rounding is predictable
    const ordered = members.map((m) => m.id).filter((id) => participants.includes(id));
    onSave({ description: description.trim(), amount: parsed, paidBy, participants: ordered });
  }

  const inputClass =
    "h-12 w-full rounded-lg border border-border bg-surface px-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent aria-[invalid=true]:border-danger";

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      aria-labelledby="add-expense-title"
      className="m-auto mb-0 w-full max-w-lg rounded-t-2xl bg-surface p-0 text-text sm:mb-auto sm:rounded-2xl"
    >
      <form onSubmit={submit} noValidate className="flex flex-col gap-4 p-4 sm:p-6">
        <header className="flex items-center justify-between">
          <h2 id="add-expense-title" className="text-xl font-semibold">
            Add shared expense
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

        <Field id="exp-desc" label="Description" error={errors.description}>
          <input
            id="exp-desc"
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              clearError("description");
            }}
            placeholder="e.g. Grocery — Shwapno"
            maxLength={80}
            aria-invalid={!!errors.description}
            aria-describedby={errors.description ? "exp-desc-error" : undefined}
            className={inputClass}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="exp-amount" label="Amount" error={errors.amount}>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 grid place-items-center text-text-muted">
                ৳
              </span>
              <input
                id="exp-amount"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  clearError("amount");
                }}
                inputMode="decimal"
                placeholder="0"
                aria-invalid={!!errors.amount}
                aria-describedby={errors.amount ? "exp-amount-error" : undefined}
                className={`${inputClass} pl-7 font-mono tabular-nums`}
              />
            </div>
          </Field>

          <Field id="exp-payer" label="Paid by">
            <select
              id="exp-payer"
              value={paidBy}
              onChange={(e) => setPaidBy(e.target.value)}
              className={inputClass}
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <fieldset>
          <legend className="mb-1.5 text-sm font-medium">Split between</legend>
          <div role="radiogroup" className="grid grid-cols-3 gap-1 rounded-lg bg-surface-muted p-1">
            {splitModes.map((s) => (
              <button
                key={s.value}
                type="button"
                role="radio"
                aria-checked={mode === s.value}
                onClick={() => {
                  setMode(s.value);
                  clearError("split");
                }}
                className={`h-10 rounded-md text-sm font-medium ${
                  mode === s.value ? "bg-surface text-accent shadow-card" : "text-text-muted"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {mode === "choose" && (
            <div className="mt-3 flex flex-wrap gap-2">
              {members.map((m) => {
                const on = chosen.includes(m.id);
                return (
                  <button
                    key={m.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => {
                      setChosen((c) => (on ? c.filter((id) => id !== m.id) : [...c, m.id]));
                      clearError("split");
                    }}
                    className={`h-11 rounded-full border px-4 text-sm font-medium ${
                      on
                        ? "border-accent bg-accent text-text-inverse"
                        : "border-border bg-surface text-text"
                    }`}
                  >
                    {on && <span aria-hidden>✓ </span>}
                    {m.name}
                  </button>
                );
              })}
            </div>
          )}
          {errors.split && <p className="mt-1 text-sm text-danger">{errors.split}</p>}

          <p className="mt-2 text-sm text-text-muted">
            {perHead !== null
              ? participants.length === 1
                ? `${members.find((m) => m.id === participants[0])?.name} covers the full ${formatTaka(parsed!)}.`
                : `About ${formatTaka(Math.round(perHead * 100) / 100)} each across ${participants.length} people.`
              : `${participants.length} ${participants.length === 1 ? "person" : "people"} selected.`}
          </p>
        </fieldset>

        <button
          type="submit"
          className="h-13 rounded-lg bg-accent font-semibold text-text-inverse hover:bg-accent-hover active:bg-accent-pressed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Save expense
        </button>
      </form>
    </dialog>
  );
}

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
        {label}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className="mt-1 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
