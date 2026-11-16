"use client";

import { Trash2 } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { TextField } from "@/components/auth/TextField";
import { Button } from "@/components/ui/Button";
import { CloseButton } from "@/components/ui/CloseButton";
import { ConfirmDelete } from "@/components/ui/ConfirmDelete";
import { CategoryIconGrid } from "@/components/ui/CategoryIconGrid";
import { CATEGORY_ICON_OPTIONS } from "@/components/ui/icons";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Category } from "@/lib/ledger";

const KEYS = new Set(CATEGORY_ICON_OPTIONS.map((o) => o.key));

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** "3 expenses and 1 recurring expense" */
export function usageText(expenses: number, recurring: number) {
  return [expenses && plural(expenses, "expense"), recurring && plural(recurring, "recurring expense")]
    .filter(Boolean)
    .join(" and ");
}

/** Add (category = null) or edit a category: name and icon; delete when editing. */
export function CategorySheet({
  open,
  category,
  categories,
  onClose,
  onSaved,
}: {
  open: boolean;
  category: Category | null;
  /** All of the user's categories, to choose where a deleted one's expenses go. */
  categories: Category[];
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const { request } = useAuth();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("tag");
  const [errors, setErrors] = useState<{ name?: string; icon?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [moveTo, setMoveTo] = useState("");

  const others = categories.filter((c) => c.id !== category?.id);
  const expenseCount = category?.expenseCount ?? 0;
  const recurringCount = category?.recurringCount ?? 0;
  const inUse = expenseCount + recurringCount > 0;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      setName(category?.name ?? "");
      // Older accounts may hold an emoji; they pick a proper icon on save.
      setIcon(category && KEYS.has(category.icon) ? category.icon : "tag");
      setErrors({});
      setFormError(null);
      setBusy(false);
      setConfirmDelete(false);
      const rest = categories.filter((c) => c.id !== category?.id);
      setMoveTo((rest.find((c) => c.name === "Miscellaneous") ?? rest[0])?.id ?? "");
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open, category, categories]);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return setErrors({ name: "Name the category, e.g. Rent" });
    setErrors({});
    setFormError(null);
    setBusy(true);
    const body = { name: name.trim(), icon };
    try {
      if (category) {
        await request(`/categories/${category.id}`, { method: "PATCH", body });
        onSaved(`${body.name} updated`);
      } else {
        await request("/categories", { method: "POST", body });
        onSaved(`${body.name} added`);
      }
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Couldn't save. Try again.";
      if (err instanceof ApiError && err.status === 409) setErrors({ name: message });
      else setFormError(message);
      setBusy(false);
    }
  }

  async function remove() {
    if (!category) return;
    setBusy(true);
    const target = inUse ? others.find((c) => c.id === moveTo) : undefined;
    try {
      await request(`/categories/${category.id}${target ? `?moveTo=${target.id}` : ""}`, { method: "DELETE" });
      onSaved(target ? `${category.name} deleted; its items moved to ${target.name}` : `${category.name} deleted`);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Couldn't delete. Try again.");
      setConfirmDelete(false);
      setBusy(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      aria-labelledby="category-sheet-title"
      className="m-auto mb-0 max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-surface p-0 text-text sm:mb-auto sm:rounded-2xl"
    >
      <form method="post" onSubmit={save} noValidate className="flex flex-col gap-5 p-4 sm:p-6">
        <header className="flex items-center justify-between">
          <h2 id="category-sheet-title" className="text-xl font-semibold">
            {category ? "Edit category" : "Add category"}
          </h2>
          <CloseButton onClick={onClose} />
        </header>

        {formError && (
          <p role="alert" className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2.5 text-sm">
            {formError}
          </p>
        )}

        <TextField
          id="category-name"
          label="Name"
          value={name}
          maxLength={30}
          placeholder="e.g. Rent, Kids, Fuel"
          error={errors.name}
          onChange={(e) => {
            setName(e.target.value);
            setErrors({});
          }}
          autoFocus={!category}
        />

        <fieldset>
          <legend className="mb-2 text-sm font-medium">Icon</legend>
          <CategoryIconGrid value={icon} onChange={setIcon} />
        </fieldset>

        {confirmDelete ? (
          <ConfirmDelete
            message={
              inUse
                ? `${category?.name} is used by ${usageText(expenseCount, recurringCount)}. Delete it and move ${
                    expenseCount + recurringCount === 1 ? "it" : "them"
                  } to another category? Its budgets are removed. This only affects your account.`
                : `Delete ${category?.name}? Its budgets are removed too. This only affects your account.`
            }
            busy={busy}
            onCancel={() => setConfirmDelete(false)}
            onConfirm={remove}
          >
            {inUse && (
              <div>
                <label htmlFor="category-move-to" className="mb-1.5 block text-sm font-medium">
                  Move to
                </label>
                <select
                  id="category-move-to"
                  value={moveTo}
                  onChange={(e) => setMoveTo(e.target.value)}
                  className="h-11 w-full rounded-lg border border-border bg-surface px-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  {others.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </ConfirmDelete>
        ) : (
          <div className="flex gap-2">
            {category && (
              <Button variant="ghost" className="text-danger hover:text-danger" onClick={() => setConfirmDelete(true)} disabled={busy}>
                <Trash2 aria-hidden size={18} />
                Delete
              </Button>
            )}
            <Button type="submit" className="flex-1" disabled={busy}>
              {busy ? "Saving…" : category ? "Save category" : "Add category"}
            </Button>
          </div>
        )}
      </form>
    </dialog>
  );
}
