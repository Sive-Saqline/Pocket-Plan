"use client";

import { useState, type ReactNode } from "react";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Plus } from "lucide-react";
import { CategoryIcon, WalletIcon } from "@/components/ui/icons";
import { walletTypes, type Category, type Wallet, type WalletType } from "@/lib/ledger";

// Shared by Add Expense, Confirm Recurring and the recurring template editor.

export const inputClass =
  "h-12 w-full rounded-lg border border-border bg-surface px-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent aria-[invalid=true]:border-danger";

export function CategoryPicker({
  categories,
  value,
  onChange,
  error,
  children,
}: {
  categories: Category[];
  value: string;
  onChange: (id: string) => void;
  error?: string;
  /** Rendered under the grid, e.g. a budget note. */
  children?: ReactNode;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium">Category</legend>
      <div role="radiogroup" aria-label="Category" className="grid grid-cols-3 gap-2">
        {categories.map((c) => {
          const on = c.id === value;
          return (
            <button
              key={c.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChange(c.id)}
              className={`flex min-h-16 flex-col items-center justify-center gap-1 rounded-lg border px-1 text-xs font-medium ${
                on ? "border-accent bg-accent/10 text-accent ring-1 ring-accent" : "border-border hover:bg-surface-muted"
              }`}
            >
              <CategoryIcon icon={c.icon} size={22} />
              <span className="max-w-full truncate">{c.name}</span>
            </button>
          );
        })}
      </div>
      {error && <p className="mt-1 text-sm text-danger">{error}</p>}
      {children}
    </fieldset>
  );
}

/** Wallet chips plus an inline "+ Add" to create one without leaving the form. */
export function WalletPicker({
  wallets,
  value,
  onChange,
  onWalletCreated,
  error,
  legend = "Paid from",
}: {
  wallets: Wallet[];
  value: string;
  onChange: (id: string) => void;
  onWalletCreated: (wallet: Wallet) => void;
  error?: string;
  legend?: string;
}) {
  const [created, setCreated] = useState<Wallet[]>([]);
  const [adding, setAdding] = useState(false);
  // until the parent reloads its list, show wallets created here too
  const all = [...wallets, ...created.filter((n) => !wallets.some((w) => w.id === n.id))];

  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium">{legend}</legend>
      <div role="radiogroup" aria-label="Wallet" className="flex flex-wrap gap-2">
        {all.map((w) => {
          const on = w.id === value;
          return (
            <button
              key={w.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChange(w.id)}
              className={`inline-flex h-11 items-center gap-1.5 rounded-full border px-4 text-sm font-medium ${
                on ? "border-accent bg-accent text-text-inverse" : "border-border bg-surface hover:bg-surface-muted"
              }`}
            >
              <WalletIcon type={w.type} />
              {w.name}
            </button>
          );
        })}
        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex h-11 items-center gap-1 rounded-full border border-dashed border-border px-4 text-sm font-medium text-accent hover:bg-surface-muted"
          >
            <Plus aria-hidden size={16} />
            Add
          </button>
        )}
      </div>
      {error && <p className="mt-1 text-sm text-danger">{error}</p>}
      {adding && (
        <NewWalletForm
          onCancel={() => setAdding(false)}
          onCreated={(w) => {
            setCreated((list) => [...list, w]);
            setAdding(false);
            onChange(w.id);
            onWalletCreated(w);
          }}
        />
      )}
    </fieldset>
  );
}

function NewWalletForm({ onCancel, onCreated }: { onCancel: () => void; onCreated: (w: Wallet) => void }) {
  const { request } = useAuth();
  const [name, setName] = useState("");
  const [type, setType] = useState<WalletType>("MOBILE_WALLET");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // A nested <form> isn't allowed, so this is a group of controls submitted by its button.
  async function create() {
    if (!name.trim()) return setError("Name the wallet, e.g. bKash");
    setBusy(true);
    try {
      onCreated(await request<Wallet>("/accounts", { method: "POST", body: { name: name.trim(), type } }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't add the wallet.");
      setBusy(false);
    }
  }

  return (
    <div role="group" aria-label="New wallet" className="mt-3 flex flex-col gap-2 rounded-lg bg-surface-muted p-3">
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <label htmlFor="wallet-name" className="sr-only">
          Wallet name
        </label>
        <input
          id="wallet-name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void create();
            }
          }}
          placeholder="Wallet name, e.g. bKash"
          maxLength={40}
          autoFocus
          aria-invalid={!!error}
          className={inputClass}
        />
        <label htmlFor="wallet-type" className="sr-only">
          Wallet type
        </label>
        <select id="wallet-type" value={type} onChange={(e) => setType(e.target.value as WalletType)} className={`${inputClass} w-auto`}>
          {walletTypes.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="h-10 rounded-lg px-3 text-sm font-medium text-text-muted hover:bg-surface">
          Cancel
        </button>
        <button
          type="button"
          onClick={create}
          disabled={busy}
          className="h-10 rounded-lg bg-accent px-4 text-sm font-semibold text-text-inverse disabled:opacity-70"
        >
          Add wallet
        </button>
      </div>
    </div>
  );
}
