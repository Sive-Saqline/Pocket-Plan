"use client";

import { ArrowRight, Check, CircleCheck } from "lucide-react";
import { useState, type FormEvent } from "react";
import { inputClass } from "@/components/expenses/Pickers";
import { Button } from "@/components/ui/Button";
import { Card, SkeletonRows } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { FormError, Sheet } from "@/components/ui/Sheet";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Balances, GroupDetail } from "@/lib/group";
import { formatTaka, parseTaka } from "@/lib/money";

type Payment = Balances["payments"][number];

/**
 * Who owes whom (PRD v4 §9): every balance, the fewest payments that clear
 * the group, Settle up (only the two people involved), and history with Undo.
 */
export function BalancesTab({
  group,
  balances,
  onChanged,
}: {
  group: GroupDetail;
  balances: Balances | null;
  onChanged: (message: string) => void;
}) {
  const { request, state } = useAuth();
  const me = state.user?.id;
  const [settling, setSettling] = useState<Payment | null>(null);
  const [undoing, setUndoing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!balances) {
    return (
      <Card>
        <SkeletonRows rows={group.members.length || 3} />
      </Card>
    );
  }

  async function undo(id: string) {
    setUndoing(id);
    setError(null);
    try {
      await request(`/groups/${group.id}/settlements/${id}`, { method: "DELETE" });
      onChanged("Payment undone");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't undo. Try again.");
    }
    setUndoing(null);
  }

  const avatarOf = (id: string) => group.members.find((m) => m.userId === id)?.avatarUrl ?? null;

  return (
    <div className="grid gap-4 lg:grid-cols-2 lg:items-start lg:gap-6">
      {error && (
        <div className="lg:col-span-2">
          <FormError message={error} />
        </div>
      )}
      <Card title="Balances">
        <ul className="divide-y divide-border">
          {balances.members.map((b) => (
            <li key={b.userId} className="flex items-center gap-3 py-3">
              <UserAvatar name={b.name} avatarUrl={b.avatarUrl} className="size-10 text-sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">
                  {b.userId === me ? `${b.name} (you)` : b.name}
                  {!b.active && <span className="font-normal text-text-muted"> (left)</span>}
                </p>
                <p className="text-sm text-text-muted">
                  Paid {formatTaka(b.paid)} · share {formatTaka(b.share)}
                </p>
              </div>
              <div className="text-right">
                <p
                  className={`font-mono text-lg font-semibold tabular-nums ${
                    b.balance > 0 ? "text-success" : b.balance < 0 ? "text-danger" : "text-text-muted"
                  }`}
                >
                  {b.balance === 0 ? "৳0" : formatTaka(b.balance, { signed: true })}
                </p>
                <p className="text-xs text-text-muted">{b.balance > 0 ? "gets back" : b.balance < 0 ? "owes" : "settled"}</p>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Settle up">
        {balances.payments.length === 0 ? (
          <EmptyState icon={CircleCheck} title="Everyone is settled up" text="New shared expenses will show up here." />
        ) : (
          <>
            <p className="mb-3 text-sm text-text-muted">
              The fewest payments that clear the group. Once you&apos;ve paid (cash, bKash, bank…), record it here.
            </p>
            <ul className="flex flex-col gap-2">
              {balances.payments.map((p) => {
                const mine = p.from === me || p.to === me;
                return (
                  <li key={`${p.from}-${p.to}`} className="flex items-center gap-3 rounded-lg border border-border p-3">
                    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="font-medium">{p.from === me ? "You" : p.fromName}</span>
                      <ArrowRight aria-hidden size={16} className="text-text-muted" />
                      <span className="sr-only">{p.from === me ? "pay" : "pays"}</span>
                      <span className="font-medium">{p.to === me ? "you" : p.toName}</span>
                      <span className="w-full font-mono text-lg font-semibold tabular-nums sm:ml-auto sm:w-auto">
                        {formatTaka(p.amount)}
                      </span>
                    </div>
                    {mine ? (
                      <Button onClick={() => setSettling(p)} className="shrink-0">
                        Settle
                      </Button>
                    ) : (
                      <span className="shrink-0 text-xs text-text-muted" title="Only the two people involved can record it">
                        Between them
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </Card>

      {balances.settlements.length > 0 && (
        <Card title="Payments made" className="lg:col-span-2">
          <ul className="divide-y divide-border">
            {balances.settlements.map((s) => (
              <li key={s.id} className="flex items-center gap-3 py-3">
                <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full bg-success/10 text-success">
                  <Check size={20} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="break-words">
                    <span className="font-medium">{s.from === me ? "You" : s.fromName}</span> paid{" "}
                    <span className="font-medium">{s.to === me ? "you" : s.toName}</span>
                  </p>
                  <p className="text-sm text-text-muted">
                    <span className="font-mono font-semibold text-text tabular-nums">{formatTaka(s.amount)}</span> ·{" "}
                    {new Date(s.settledAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
                {(s.from === me || s.to === me) && (
                  <button
                    type="button"
                    onClick={() => undo(s.id)}
                    disabled={undoing === s.id}
                    className="h-9 rounded-lg px-3 text-sm font-medium text-accent hover:bg-surface-muted disabled:opacity-60"
                  >
                    {undoing === s.id ? "Undoing…" : "Undo"}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <SettleSheet
        group={group}
        payment={settling}
        me={me}
        avatarOf={avatarOf}
        onClose={() => setSettling(null)}
        onDone={(message) => {
          setSettling(null);
          onChanged(message);
        }}
      />
    </div>
  );
}

function SettleSheet({
  group,
  payment,
  me,
  avatarOf,
  onClose,
  onDone,
}: {
  group: GroupDetail;
  payment: Payment | null;
  me: string | undefined;
  avatarOf: (id: string) => string | null;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const { request } = useAuth();
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [shownFor, setShownFor] = useState<Payment | null>(null);

  // Reset when a different payment is opened (prefilled with the full amount).
  if (payment && payment !== shownFor) {
    setShownFor(payment);
    setAmount(String(payment.amount));
    setError(null);
    setBusy(false);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!payment) return;
    const value = parseTaka(amount);
    if (value === null) return setError("Enter an amount above ৳0, with at most 2 decimals");
    setBusy(true);
    setError(null);
    try {
      await request(`/groups/${group.id}/settlements`, {
        method: "POST",
        body: { fromUserId: payment.from, toUserId: payment.to, amount: value },
      });
      onDone(`Recorded ${formatTaka(value)} from ${payment.from === me ? "you" : payment.fromName} to ${payment.to === me ? "you" : payment.toName}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't record it. Try again.");
      setBusy(false);
    }
  }

  return (
    <Sheet open={!!payment} onClose={onClose} title="Record a payment">
      {payment && (
        <form onSubmit={submit} noValidate className="flex flex-col gap-5">
          <FormError message={error} />
          <p className="flex flex-wrap items-center gap-2">
            <UserAvatar name={payment.fromName} avatarUrl={avatarOf(payment.from)} className="size-8 text-xs" />
            <span className="font-medium">{payment.from === me ? "You" : payment.fromName}</span>
            <span className="text-text-muted">paid</span>
            <UserAvatar name={payment.toName} avatarUrl={avatarOf(payment.to)} className="size-8 text-xs" />
            <span className="font-medium">{payment.to === me ? "you" : payment.toName}</span>
          </p>
          <div>
            <label htmlFor="settle-amount" className="mb-1.5 block text-sm font-medium">
              Amount
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 grid place-items-center text-text-muted">৳</span>
              <input
                id="settle-amount"
                value={amount}
                inputMode="decimal"
                onChange={(e) => setAmount(e.target.value)}
                className={`${inputClass} pl-7 font-mono tabular-nums`}
              />
            </div>
            <p className="mt-1 text-sm text-text-muted">
              Suggested: {formatTaka(payment.amount)} clears it. A smaller amount records a part payment.
            </p>
          </div>
          <Button type="submit" disabled={busy}>
            {busy ? "Saving…" : "Record payment"}
          </Button>
        </form>
      )}
    </Sheet>
  );
}
