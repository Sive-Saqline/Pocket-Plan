"use client";

import { useState } from "react";
import { Repeat, TriangleAlert } from "lucide-react";
import { AppShell, Fab } from "@/components/app/AppShell";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { CategoryBadge } from "@/components/ui/icons";
import { Card, ErrorBanner, SkeletonRows } from "@/components/ui/Card";
import { Toast, useToast } from "@/components/ui/Toast";
import { dayLabel } from "@/lib/dates";
import { frequencyLabel, type RecurringExpense } from "@/lib/ledger";
import { formatTaka } from "@/lib/money";
import { usePersonalData } from "@/lib/use-personal-data";
import { notifyRecurringChanged, useRecurring } from "@/lib/use-recurring";
import { ConfirmRecurringSheet, type ConfirmResult } from "./ConfirmRecurringSheet";
import { RecurringSheet } from "./RecurringSheet";

/** "Due today", "Due yesterday", "Due 26 Oct". */
const dueLabel = (date: string) => {
  const day = dayLabel(date);
  return `Due ${day === "Today" || day === "Yesterday" ? day.toLowerCase() : day}`;
};

export function confirmSummary({ confirmed, skipped }: ConfirmResult) {
  if (!confirmed && !skipped) return null;
  return [confirmed && `${confirmed} confirmed`, skipped && `${skipped} skipped`].filter(Boolean).join(" · ");
}

export function RecurringScreen() {
  const recurring = useRecurring();
  const personal = usePersonalData();
  const toast = useToast();
  const [editor, setEditor] = useState<{ open: boolean; template: RecurringExpense | null }>({ open: false, template: null });
  const [reviewing, setReviewing] = useState<RecurringExpense[] | null>(null);

  const list = recurring.data;
  const groups = [
    { title: "Due now", items: list?.filter((r) => r.due) ?? [] },
    { title: "Active", items: list?.filter((r) => r.isActive && !r.due) ?? [] },
    { title: "Paused", items: list?.filter((r) => !r.isActive) ?? [] },
  ];

  return (
    <AppShell title="Recurring">
      <p className="text-sm text-text-muted">
        Bills and subscriptions that repeat. When one is due, review it and confirm to add the expense. Nothing is
        added without you.
      </p>

      {recurring.error && <ErrorBanner message={recurring.error} onRetry={recurring.reload} />}

      {!list ? (
        <Card>
          <SkeletonRows rows={4} />
        </Card>
      ) : list.length === 0 ? (
        <Card>
          <EmptyState
            icon={Repeat}
            title="No recurring expenses yet."
            text="Add rent, internet or subscriptions so you never re-type them."
          >
            <Button onClick={() => setEditor({ open: true, template: null })}>Add recurring expense</Button>
          </EmptyState>
        </Card>
      ) : (
        groups
          .filter((g) => g.items.length > 0)
          .map((g) => (
            <Card
              key={g.title}
              title={g.title}
              aside={
                g.title === "Due now" && (
                  <Button size="sm" onClick={() => setReviewing(g.items)}>
                    Review {g.items.length}
                  </Button>
                )
              }
            >
              <ul>
                {g.items.map((r) => {
                  const category = personal.categoryById(r.categoryId);
                  const wallet = personal.walletById(r.accountId);
                  return (
                    <li key={r.id}>
                      <button
                        type="button"
                        onClick={() => setEditor({ open: true, template: r })}
                        className="flex min-h-16 w-full items-center gap-3 rounded-lg px-1 py-2 text-left hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-accent"
                      >
                        <CategoryBadge icon={category?.icon} className={r.isActive ? "" : "opacity-50"} />
                        <span className="min-w-0 flex-1">
                          <span className={`block truncate font-medium ${r.isActive ? "" : "text-text-muted"}`}>{r.description}</span>
                          <span className="block truncate text-sm text-text-muted">
                            {frequencyLabel(r.frequency)}
                            {wallet && ` · ${wallet.name}`}
                          </span>
                        </span>
                        <span className="shrink-0 text-right">
                          <span className="block font-mono text-lg font-semibold tabular-nums">{formatTaka(r.amount)}</span>
                          <span className={`flex items-center justify-end gap-1 text-xs ${r.due ? "font-semibold text-danger" : "text-text-muted"}`}>
                            {r.due ? (
                              <>
                                <TriangleAlert aria-hidden size={12} />
                                {r.dueCount > 1 ? `${r.dueCount} due` : dueLabel(r.nextDueDate)}
                              </>
                            ) : r.isActive ? (
                              `Next ${dayLabel(r.nextDueDate)}`
                            ) : (
                              "Paused"
                            )}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </Card>
          ))
      )}

      <Fab label="Add recurring expense" onClick={() => setEditor({ open: true, template: null })} />
      <RecurringSheet
        open={editor.open}
        template={editor.template}
        categories={personal.categories}
        wallets={personal.wallets}
        onClose={() => setEditor({ open: false, template: null })}
        onSaved={(message) => {
          setEditor({ open: false, template: null });
          notifyRecurringChanged();
          toast.show(message);
        }}
        onWalletCreated={personal.reloadWallets}
      />
      <ConfirmRecurringSheet
        queue={reviewing}
        categories={personal.categories}
        wallets={personal.wallets}
        onWalletCreated={personal.reloadWallets}
        onConfirmed={() => {}}
        onDone={(result) => {
          setReviewing(null);
          notifyRecurringChanged();
          const summary = confirmSummary(result);
          if (summary) toast.show(summary);
        }}
      />
      <Toast message={toast.message} />
    </AppShell>
  );
}
