"use client";

import { Trash2 } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { TextField } from "@/components/auth/TextField";
import { Button } from "@/components/ui/Button";
import { CloseButton } from "@/components/ui/CloseButton";
import { ConfirmDelete } from "@/components/ui/ConfirmDelete";
import { CATEGORY_ICON_OPTIONS } from "@/components/ui/icons";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Category } from "@/lib/ledger";

const KEYS = new Set(CATEGORY_ICON_OPTIONS.map((o) => o.key));

/** Add (category = null) or edit a category: name and icon; delete when editing. */
export function CategorySheet({
  open,
  category,
  onClose,
  onSaved,
}: {
  open: boolean;
  category: Category | null;
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
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open, category]);

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
    try {
      await request(`/categories/${category.id}`, { method: "DELETE" });
      onSaved(`${category.name} deleted`);
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
          <div role="radiogroup" aria-label="Icon" className="grid grid-cols-6 gap-2 sm:grid-cols-8">
            {CATEGORY_ICON_OPTIONS.map((o) => {
              const on = o.key === icon;
              return (
                <button
                  key={o.key}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  aria-label={o.label}
                  title={o.label}
                  onClick={() => setIcon(o.key)}
                  className={`grid aspect-square min-h-11 place-items-center rounded-lg border ${
                    on ? "border-accent bg-accent/10 text-accent ring-1 ring-accent" : "border-border text-text-muted hover:bg-surface-muted hover:text-text"
                  }`}
                >
                  <o.icon aria-hidden size={20} strokeWidth={1.75} />
                </button>
              );
            })}
          </div>
        </fieldset>

        {confirmDelete ? (
          <ConfirmDelete
            message={`Delete ${category?.name}? Its budgets are removed too. This can't be undone.`}
            busy={busy}
            onCancel={() => setConfirmDelete(false)}
            onConfirm={remove}
          />
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
