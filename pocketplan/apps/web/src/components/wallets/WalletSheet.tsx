"use client";

import { Trash2 } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { TextField } from "@/components/auth/TextField";
import { Button } from "@/components/ui/Button";
import { CloseButton } from "@/components/ui/CloseButton";
import { ConfirmDelete } from "@/components/ui/ConfirmDelete";
import { WalletIcon } from "@/components/ui/icons";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { walletTypes, type Wallet, type WalletType } from "@/lib/ledger";
import { parseBalance } from "@/lib/money";

/** Add (wallet = null) or edit a wallet: name, type and balance; delete when editing. */
export function WalletSheet({
  open,
  wallet,
  onClose,
  onSaved,
}: {
  open: boolean;
  wallet: Wallet | null;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const { request } = useAuth();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState<WalletType>("CASH");
  const [balance, setBalance] = useState("");
  const [errors, setErrors] = useState<{ name?: string; balance?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      setName(wallet?.name ?? "");
      setType(wallet?.type ?? "MOBILE_WALLET");
      setBalance(wallet ? String(wallet.balance) : "");
      setErrors({});
      setFormError(null);
      setBusy(false);
      setConfirmDelete(false);
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open, wallet]);

  async function save(event: FormEvent) {
    event.preventDefault();
    const parsed = parseBalance(balance);
    const found: typeof errors = {};
    if (!name.trim()) found.name = "Name the wallet, e.g. bKash";
    if (parsed === null) found.balance = "Enter an amount like 2500 or -1200.50";
    setErrors(found);
    setFormError(null);
    if (Object.keys(found).length || parsed === null) return;

    setBusy(true);
    const body = { name: name.trim(), type, balance: parsed };
    try {
      if (wallet) {
        await request(`/accounts/${wallet.id}`, { method: "PATCH", body });
        onSaved(`${body.name} updated`);
      } else {
        await request("/accounts", { method: "POST", body });
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
    if (!wallet) return;
    setBusy(true);
    try {
      await request(`/accounts/${wallet.id}`, { method: "DELETE" });
      onSaved(`${wallet.name} deleted`);
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
      aria-labelledby="wallet-sheet-title"
      className="m-auto mb-0 max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-surface p-0 text-text sm:mb-auto sm:rounded-2xl"
    >
      <form method="post" onSubmit={save} noValidate className="flex flex-col gap-5 p-4 sm:p-6">
        <header className="flex items-center justify-between">
          <h2 id="wallet-sheet-title" className="text-xl font-semibold">
            {wallet ? "Edit wallet" : "Add wallet"}
          </h2>
          <CloseButton onClick={onClose} />
        </header>

        {formError && (
          <p role="alert" className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2.5 text-sm">
            {formError}
          </p>
        )}

        <TextField
          id="wallet-name"
          label="Name"
          value={name}
          maxLength={40}
          placeholder="e.g. bKash, City Bank"
          error={errors.name}
          onChange={(e) => {
            setName(e.target.value);
            setErrors((x) => ({ ...x, name: undefined }));
          }}
          autoFocus={!wallet}
        />

        <fieldset>
          <legend className="mb-2 text-sm font-medium">Type</legend>
          <div role="radiogroup" aria-label="Wallet type" className="flex flex-wrap gap-2">
            {walletTypes.map((t) => {
              const on = t.value === type;
              return (
                <button
                  key={t.value}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setType(t.value)}
                  className={`inline-flex h-11 items-center gap-1.5 rounded-full border px-4 text-sm font-medium ${
                    on ? "border-accent bg-accent text-text-inverse" : "border-border bg-surface hover:bg-surface-muted"
                  }`}
                >
                  <WalletIcon type={t.value} />
                  {t.label}
                </button>
              );
            })}
          </div>
        </fieldset>

        <div>
          <label htmlFor="wallet-balance" className="mb-1.5 block text-sm font-medium">
            Balance
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3 grid place-items-center text-text-muted">৳</span>
            <input
              id="wallet-balance"
              value={balance}
              onChange={(e) => {
                setBalance(e.target.value);
                setErrors((x) => ({ ...x, balance: undefined }));
              }}
              inputMode="decimal"
              placeholder="0"
              autoComplete="off"
              aria-invalid={!!errors.balance}
              aria-describedby="wallet-balance-hint"
              className="h-12 w-full rounded-lg border border-border bg-surface pr-3 pl-7 font-mono text-lg tabular-nums focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent aria-[invalid=true]:border-danger"
            />
          </div>
          <p id="wallet-balance-hint" className={`mt-1 text-sm ${errors.balance ? "text-danger" : "text-text-muted"}`}>
            {errors.balance ??
              "What's in this wallet now. You keep it up to date; expenses don't change it. Use a minus for money owed, e.g. on a card."}
          </p>
        </div>

        {confirmDelete ? (
          <ConfirmDelete
            message={`Delete ${wallet?.name}? This can't be undone.`}
            busy={busy}
            onCancel={() => setConfirmDelete(false)}
            onConfirm={remove}
          />
        ) : (
          <div className="flex gap-2">
            {wallet && (
              <Button variant="ghost" className="text-danger hover:text-danger" onClick={() => setConfirmDelete(true)} disabled={busy}>
                <Trash2 aria-hidden size={18} />
                Delete
              </Button>
            )}
            <Button type="submit" className="flex-1" disabled={busy}>
              {busy ? "Saving…" : wallet ? "Save wallet" : "Add wallet"}
            </Button>
          </div>
        )}
      </form>
    </dialog>
  );
}
