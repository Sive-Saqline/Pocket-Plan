"use client";

import { ChevronLeft, House, Plus } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { BalancePreview } from "@/lib/api";
import { formatTaka } from "@/lib/money";
import { useBalancePreview } from "@/lib/use-balance-preview";
import { useGroup } from "@/lib/use-group";
import { AddExpenseSheet } from "./AddExpenseSheet";
import { BalancesTab } from "./BalancesTab";
import { ExpensesTab } from "./ExpensesTab";
import { MembersTab } from "./MembersTab";

const tabs = ["Balances", "Expenses", "Members"] as const;
type Tab = (typeof tabs)[number];

export function GroupScreen() {
  const { group, setGroup, hydrated, reset } = useGroup();
  const preview = useBalancePreview(group, hydrated);
  const [tab, setTab] = useState<Tab>("Balances");
  const [adding, setAdding] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const total = group.expenses.reduce((sum, e) => sum + e.amount, 0);

  function settle(p: BalancePreview["payments"][number]) {
    setGroup((g) => ({
      ...g,
      settlements: [
        ...g.settlements,
        { id: crypto.randomUUID(), from: p.from, to: p.to, amount: p.amount, settledAt: new Date().toISOString() },
      ],
    }));
    setToast(`Recorded: ${p.fromName} paid ${p.toName} ${formatTaka(p.amount)}`);
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-10 border-b border-border bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center gap-2 px-2 sm:px-4 lg:h-16 lg:px-6">
        <Link
          href="/"
          aria-label="Back to home"
          className="grid size-11 place-items-center rounded-lg hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-accent"
        >
          <ChevronLeft aria-hidden size={24} />
        </Link>
        <h1 className="flex-1 truncate font-semibold">{group.name}</h1>
        <button
          type="button"
          onClick={() => {
            reset();
            setToast("Demo data restored");
          }}
          className="h-11 rounded-lg px-3 text-sm font-medium text-text-muted hover:bg-surface-muted"
        >
          Reset demo
        </button>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-4 px-4 pt-4 pb-28 sm:px-6 lg:gap-6 lg:px-8 lg:pt-6">

        <section className="flex items-center gap-3 rounded-xl bg-accent p-4 text-text-inverse shadow-card">
          <span aria-hidden className="grid size-12 place-items-center rounded-xl bg-white/15">
            <House size={24} strokeWidth={1.75} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-lg leading-snug font-semibold break-words">{group.name}</p>
            <p className="text-sm opacity-85">{group.members.length} members · ৳ BDT</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-xs opacity-85">Total spent</p>
            <p className="font-mono text-xl font-semibold tabular-nums">{formatTaka(total)}</p>
          </div>
        </section>

        {preview.status === "error" && (
          <div role="alert" className="flex items-center gap-3 rounded-lg border border-danger/40 bg-danger/10 px-4 py-3">
            <p className="flex-1 text-sm">
              <span className="font-medium">{preview.message}</span>{" "}
              <span className="text-text-muted">
                Balances may be out of date. Is the API running (<code>npm run dev:api</code>)?
              </span>
            </p>
            <button
              type="button"
              onClick={preview.retry}
              className="h-9 shrink-0 rounded-lg bg-surface px-3 text-sm font-semibold text-accent shadow-card"
            >
              Retry
            </button>
          </div>
        )}

        <div role="tablist" aria-label="Group sections" className="grid grid-cols-3 gap-1 rounded-lg bg-surface p-1 shadow-card sm:max-w-md">
          {tabs.map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              id={`tab-${t}`}
              aria-selected={tab === t}
              aria-controls={`panel-${t}`}
              onClick={() => setTab(t)}
              className={`h-10 rounded-md text-sm font-semibold ${
                tab === t ? "bg-accent text-text-inverse" : "text-text-muted hover:bg-surface-muted"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
          {tab === "Balances" && preview.status === "error" && !preview.data && (
            <div className="rounded-xl bg-surface p-4 py-8 text-center shadow-card">
              <p className="font-medium">Balances can&apos;t be calculated right now.</p>
              <p className="mt-1 text-sm text-text-muted">
                Your expenses are saved. Retry once the API is back.
              </p>
            </div>
          )}
          {tab === "Balances" && !(preview.status === "error" && !preview.data) && (
            <BalancesTab
              group={group}
              preview={preview.data}
              loading={preview.status === "loading"}
              onSettle={settle}
              onUndoSettlement={(id) =>
                setGroup((g) => ({ ...g, settlements: g.settlements.filter((s) => s.id !== id) }))
              }
            />
          )}
          {tab === "Expenses" && (
            <ExpensesTab
              group={group}
              preview={preview.status === "ready" ? preview.data : null}
              onAdd={() => setAdding(true)}
              onDelete={(id) =>
                setGroup((g) => ({ ...g, expenses: g.expenses.filter((e) => e.id !== id) }))
              }
            />
          )}
          {tab === "Members" && (
            <MembersTab
              group={group}
              onAdd={(name) =>
                setGroup((g) => ({
                  ...g,
                  members: [...g.members, { id: crypto.randomUUID(), name }],
                }))
              }
              onRemove={(id) =>
                setGroup((g) => ({ ...g, members: g.members.filter((m) => m.id !== id) }))
              }
            />
          )}
        </div>
      </main>

      <button
        type="button"
        onClick={() => setAdding(true)}
        aria-label="Add shared expense"
        className="fixed right-4 bottom-6 grid size-14 place-items-center rounded-full bg-accent text-text-inverse shadow-lg hover:bg-accent-hover active:bg-accent-pressed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:right-6 lg:right-8 lg:bottom-8"
      >
        <Plus aria-hidden size={28} />
      </button>

      <AddExpenseSheet
        open={adding}
        members={group.members}
        onClose={() => setAdding(false)}
        onSave={(expense) => {
          setGroup((g) => ({ ...g, expenses: [...g.expenses, { id: crypto.randomUUID(), ...expense }] }));
          setAdding(false);
          setTab("Balances");
          setToast(`Added ${expense.description} · ${formatTaka(expense.amount)}`);
        }}
      />

      <div aria-live="polite" className="pointer-events-none fixed inset-x-4 bottom-24 flex justify-center">
        {toast && (
          <p className="max-w-sm rounded-lg bg-text px-4 py-3 text-sm text-surface shadow-lg">{toast}</p>
        )}
      </div>
    </div>
  );
}
