"use client";

import { ReceiptText, Target } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { CategoryIcon, WalletIcon } from "@/components/ui/icons";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { AppShell, Fab } from "@/components/app/AppShell";
import { BudgetBar, BudgetLabel } from "@/components/budgets/BudgetBar";
import { ExpenseRow } from "@/components/expenses/ExpenseRow";
import { ExpenseSheet } from "@/components/expenses/ExpenseSheet";
import { GroupShareCard } from "./GroupShareCard";
import { Card, ErrorBanner, SkeletonRows } from "@/components/ui/Card";
import { Toast, useToast } from "@/components/ui/Toast";
import { useAuth } from "@/lib/auth";
import { currentMonth, daysLeft, monthLabel } from "@/lib/dates";
import type { Expense, MonthSummary } from "@/lib/ledger";
import { formatTaka } from "@/lib/money";
import { useApiData } from "@/lib/use-api-data";
import { usePersonalData } from "@/lib/use-personal-data";
import { notifyRecurringChanged, useRecurring } from "@/lib/use-recurring";
import { ConfirmRecurringSheet } from "@/components/recurring/ConfirmRecurringSheet";
import { DueRecurringBanner } from "@/components/recurring/DueRecurringBanner";
import { confirmSummary } from "@/components/recurring/RecurringScreen";
import type { RecurringExpense } from "@/lib/ledger";

export function HomeScreen() {
  const { state } = useAuth();
  const month = currentMonth();
  const summary = useApiData<MonthSummary>(`/reports/summary?month=${month}`);
  const personal = usePersonalData();
  const toast = useToast();
  const [sheet, setSheet] = useState<{ open: boolean; expense: Expense | null }>({ open: false, expense: null });
  const recurring = useRecurring();
  const [reviewing, setReviewing] = useState<RecurringExpense[] | null>(null);

  const firstName = state.user?.name.split(" ")[0] ?? "";
  const s = summary.data;
  const isEmpty = s !== null && s.count === 0 && s.previousTotal === 0;

  return (
    <AppShell title="Home">
      <section>
        <h2 className="text-2xl font-semibold">Hi, {firstName}</h2>
        <p className="text-text-muted">Here&apos;s your {monthLabel(month)} so far.</p>
      </section>

      {summary.error && <ErrorBanner message={summary.error} onRetry={summary.reload} />}

      <DueRecurringBanner due={recurring.due} onReview={() => setReviewing(recurring.due)} />

      {!s ? (
        <Card>
          <SkeletonRows rows={3} />
        </Card>
      ) : isEmpty ? (
        <Card>
          <EmptyState
            icon={ReceiptText}
            title="No expenses yet."
            text="Add what you spend and PocketPlan shows where your money goes."
          >
            <Button onClick={() => setSheet({ open: true, expense: null })}>Add expense</Button>
          </EmptyState>
        </Card>
      ) : (
        // Phones: one column in order 1-5. Desktop: two independent columns
        // (spending + categories | budgets + recent), wallets across the bottom.
        <div className="grid gap-4 lg:grid-cols-2 lg:items-start lg:gap-6">
          <div className="contents lg:flex lg:flex-col lg:gap-6">
          <SpendHero summary={s} className="order-1" />

          <Card
            title="Where it went"
            className="order-3"
            aside={
              <Link href="/expenses" className="text-sm font-semibold text-accent hover:underline">
                All expenses
              </Link>
            }
          >
            {s.byCategory.length === 0 ? (
              <p className="py-4 text-sm text-text-muted">Nothing spent in {monthLabel(month)} yet.</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {s.byCategory.map((c, i) => (
                  <li key={c.categoryId}>
                    <Link
                      href={`/expenses?category=${c.categoryId}`}
                      className="block rounded-lg px-1 py-2 hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-accent"
                    >
                      <span className="flex items-center gap-2">
                        <CategoryIcon icon={c.icon} size={18} className="text-text-muted" />
                        <span className="flex-1 font-medium">{c.name}</span>
                        <span className="text-sm text-text-muted">{c.share}%</span>
                        <span className="w-24 text-right font-mono font-semibold tabular-nums">{formatTaka(c.total)}</span>
                      </span>
                      <span aria-hidden className="mt-1.5 block h-2 overflow-hidden rounded-full bg-surface-muted">
                        <span
                          className="block h-full rounded-full"
                          style={{
                            width: `${Math.max(c.share, 2)}%`,
                            background: `var(--chart-${(i % 6) + 1})`,
                          }}
                        />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          </div>

          <div className="contents lg:flex lg:flex-col lg:gap-6">

          <Card
            title="Budgets"
            className="order-2"
            aside={
              <Link href="/budgets" className="text-sm font-semibold text-accent hover:underline">
                {s.budget.lines.length ? "Manage" : "Set up"}
              </Link>
            }
          >
            {s.budget.lines.length === 0 ? (
              <Link
                href="/budgets"
                className="flex items-center gap-3 rounded-lg border border-dashed border-border p-3 hover:bg-surface-muted"
              >
                <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full bg-accent/10 text-accent">
                  <Target size={20} strokeWidth={1.75} />
                </span>
                <span className="flex-1">
                  <span className="block font-medium">Set a budget for your biggest category.</span>
                  <span className="block text-sm text-text-muted">
                    {s.byCategory[0]
                      ? `${s.byCategory[0].name} is your top spend this month.`
                      : "We'll show how close you are as you spend."}
                  </span>
                </span>
              </Link>
            ) : (
              <ul className="flex flex-col gap-4 pt-1">
                {s.budget.lines.slice(0, 4).map((l) => (
                  <li key={l.categoryId}>
                    <p className="mb-1.5 flex items-center gap-2">
                      <CategoryIcon icon={l.icon} size={18} className="text-text-muted" />
                      <span className="flex-1 font-medium">{l.name}</span>
                      <span className="font-mono text-sm tabular-nums">
                        <span className="font-semibold">{formatTaka(l.spent)}</span>
                        <span className="text-text-muted"> / {formatTaka(l.planned!)}</span>
                      </span>
                    </p>
                    <BudgetBar spent={l.spent} planned={l.planned!} status={l.status} />
                    <p className="mt-1 text-xs">
                      <BudgetLabel status={l.status} remaining={l.remaining!} percent={l.percent!} />
                    </p>
                  </li>
                ))}
                {s.budget.lines.length > 4 && (
                  <li>
                    <Link href="/budgets" className="text-sm font-semibold text-accent hover:underline">
                      +{s.budget.lines.length - 4} more
                    </Link>
                  </li>
                )}
              </ul>
            )}
          </Card>

          <Card
            title="Recent expenses"
            className="order-4"
            aside={
              <Link href="/expenses" className="text-sm font-semibold text-accent hover:underline">
                See all
              </Link>
            }
          >
            {s.recent.length === 0 ? (
              <p className="py-4 text-sm text-text-muted">No expenses this month yet.</p>
            ) : (
              <ul>
                {s.recent.map((e) => (
                  <ExpenseRow
                    key={e.id}
                    expense={e}
                    category={personal.categoryById(e.categoryId)}
                    wallet={personal.walletById(e.accountId)}
                    onSelect={(expense) => setSheet({ open: true, expense })}
                  />
                ))}
              </ul>
            )}
          </Card>

          </div>

          <Card title="By wallet" className="order-5 lg:col-span-2">
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {s.byWallet.map((w) => (
                <li key={w.accountId} className="rounded-lg border border-border p-3">
                  <p className="flex items-center gap-1.5 text-sm text-text-muted">
                    <WalletIcon type={w.type} className="shrink-0" />
                    <span className="truncate">{w.name}</span>
                  </p>
                  <p className="font-mono text-lg font-semibold tabular-nums">{formatTaka(w.total)}</p>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}

      <GroupShareCard month={month} />

      <Fab label="Add expense" onClick={() => setSheet({ open: true, expense: null })} />
      <ExpenseSheet
        open={sheet.open}
        expense={sheet.expense}
        categories={personal.categories}
        wallets={personal.wallets}
        onClose={() => setSheet({ open: false, expense: null })}
        onSaved={(e, created) => {
          setSheet({ open: false, expense: null });
          summary.reload();
          toast.show(`${created ? "Added" : "Updated"} ${formatTaka(e.amount)}${e.description ? ` · ${e.description}` : ""}`);
        }}
        onDeleted={(e) => {
          setSheet({ open: false, expense: null });
          summary.reload();
          toast.show(`Deleted ${formatTaka(e.amount)} expense`);
        }}
        onWalletCreated={personal.reloadWallets}
      />
      <ConfirmRecurringSheet
        queue={reviewing}
        categories={personal.categories}
        wallets={personal.wallets}
        onWalletCreated={personal.reloadWallets}
        onConfirmed={summary.reload}
        onDone={(result) => {
          setReviewing(null);
          notifyRecurringChanged();
          const text = confirmSummary(result);
          if (text) toast.show(text);
        }}
      />
      <Toast message={toast.message} />
    </AppShell>
  );
}

function SpendHero({ summary: s, className = "" }: { summary: MonthSummary; className?: string }) {
  const left = daysLeft(s.month);
  const change = s.previousTotal > 0 ? Math.round(((s.total - s.previousTotal) / s.previousTotal) * 100) : null;
  return (
    <section className={`rounded-xl bg-accent p-5 text-text-inverse shadow-card ${className}`}>
      <p className="text-sm opacity-90">You spent in {monthLabel(s.month, { short: true })}</p>
      <p className="mt-1 font-mono text-4xl font-bold tabular-nums">{formatTaka(s.total)}</p>
      {s.budget.planned > 0 && (
        <p className="mt-1 text-sm opacity-90">
          {formatTaka(s.budget.spentOnBudgeted)} of {formatTaka(s.budget.planned)} budgeted ·{" "}
          {Math.floor((s.budget.spentOnBudgeted * 100) / s.budget.planned)}%
        </p>
      )}
      <p className="mt-2 text-sm opacity-90">
        {s.count} {s.count === 1 ? "expense" : "expenses"}
        {left !== null && ` · ${left} ${left === 1 ? "day" : "days"} left`}
      </p>
      <p className="mt-3 inline-flex rounded-full bg-white/15 px-3 py-1 text-sm">
        {change === null
          ? `Nothing recorded in ${monthLabel(s.previousMonth, { short: true })}`
          : `${formatTaka(s.previousTotal)} in ${monthLabel(s.previousMonth, { short: true })} · ${
              change === 0 ? "same so far" : `${Math.abs(change)}% ${change > 0 ? "more" : "less"} so far`
            }`}
      </p>
    </section>
  );
}
