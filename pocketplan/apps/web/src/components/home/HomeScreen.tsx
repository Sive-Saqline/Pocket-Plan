"use client";

import Link from "next/link";
import { useState } from "react";
import { AppShell, Fab } from "@/components/app/AppShell";
import { BudgetBar, BudgetLabel } from "@/components/budgets/BudgetBar";
import { ExpenseRow } from "@/components/expenses/ExpenseRow";
import { ExpenseSheet } from "@/components/expenses/ExpenseSheet";
import { Card, ErrorBanner, SkeletonRows } from "@/components/ui/Card";
import { Toast, useToast } from "@/components/ui/Toast";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { currentMonth, daysLeft, isoDate, monthLabel } from "@/lib/dates";
import { walletIcon, type Expense, type MonthSummary } from "@/lib/ledger";
import { formatTaka } from "@/lib/money";
import { useApiData } from "@/lib/use-api-data";
import { usePersonalData } from "@/lib/use-personal-data";
import { notifyRecurringChanged, useRecurring } from "@/lib/use-recurring";
import { ConfirmRecurringSheet } from "@/components/recurring/ConfirmRecurringSheet";
import { DueRecurringBanner } from "@/components/recurring/DueRecurringBanner";
import { confirmSummary } from "@/components/recurring/RecurringScreen";
import type { RecurringExpense } from "@/lib/ledger";

export function HomeScreen() {
  const { state, request } = useAuth();
  const month = currentMonth();
  const summary = useApiData<MonthSummary>(`/reports/summary?month=${month}`);
  const personal = usePersonalData();
  const toast = useToast();
  const [sheet, setSheet] = useState<{ open: boolean; expense: Expense | null }>({ open: false, expense: null });
  const [seeding, setSeeding] = useState(false);
  const recurring = useRecurring();
  const [reviewing, setReviewing] = useState<RecurringExpense[] | null>(null);

  const firstName = state.user?.name.split(" ")[0] ?? "";
  const s = summary.data;
  const isEmpty = s !== null && s.count === 0 && s.previousTotal === 0;

  async function loadSample() {
    setSeeding(true);
    try {
      await request("/expenses/sample-data", { method: "POST", body: { today: isoDate() } });
      personal.reload();
      notifyRecurringChanged();
      summary.reload();
      toast.show("Sample month loaded");
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "Couldn't load sample data");
    } finally {
      setSeeding(false);
    }
  }

  return (
    <AppShell title="Home">
      <section>
        <h2 className="text-2xl font-semibold">Hi, {firstName} 👋</h2>
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
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <span aria-hidden className="text-4xl">
              🧾
            </span>
            <p className="text-lg font-semibold">No expenses yet.</p>
            <p className="max-w-xs text-sm text-text-muted">
              Tap + to add your first one, or load a sample month to see how PocketPlan works.
            </p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={() => setSheet({ open: true, expense: null })}
                className="h-11 rounded-lg bg-accent px-4 font-semibold text-text-inverse hover:bg-accent-hover"
              >
                Add expense
              </button>
              <button
                type="button"
                onClick={loadSample}
                disabled={seeding}
                className="h-11 rounded-lg border border-border px-4 font-semibold text-accent hover:bg-surface-muted disabled:opacity-60"
              >
                {seeding ? "Loading…" : "Load sample month"}
              </button>
            </div>
          </div>
        </Card>
      ) : (
        <>
          <SpendHero summary={s} />

          <Card
            title="Budgets"
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
                <span aria-hidden className="text-2xl">
                  🎯
                </span>
                <span className="flex-1">
                  <span className="block font-medium">Set a budget for your biggest category.</span>
                  <span className="block text-sm text-text-muted">
                    {s.byCategory[0]
                      ? `${s.byCategory[0].icon} ${s.byCategory[0].name} is your top spend this month.`
                      : "We'll show how close you are as you spend."}
                  </span>
                </span>
              </Link>
            ) : (
              <ul className="flex flex-col gap-4 pt-1">
                {s.budget.lines.slice(0, 4).map((l) => (
                  <li key={l.categoryId}>
                    <p className="mb-1.5 flex items-center gap-2">
                      <span aria-hidden>{l.icon}</span>
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
            title="Where it went"
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
                        <span aria-hidden className="text-lg">
                          {c.icon}
                        </span>
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

          <Card
            title="Recent expenses"
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

          <Card title="By wallet">
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {s.byWallet.map((w) => (
                <li key={w.accountId} className="rounded-lg border border-border p-3">
                  <p className="truncate text-sm text-text-muted">
                    <span aria-hidden>{walletIcon(w.type)} </span>
                    {w.name}
                  </p>
                  <p className="font-mono text-lg font-semibold tabular-nums">{formatTaka(w.total)}</p>
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}

      <Link
        href="/groups/demo"
        className="group flex items-center gap-4 rounded-xl bg-surface p-4 shadow-card hover:ring-2 hover:ring-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <span aria-hidden className="grid size-12 place-items-center rounded-xl bg-accent/15 text-2xl">
          🏠
        </span>
        <span className="flex-1">
          <span className="block font-semibold">Mess — Bashundhara</span>
          <span className="block text-sm text-text-muted">Demo group · split bills and settle up</span>
        </span>
        <span aria-hidden className="text-xl text-text-muted transition-transform group-hover:translate-x-0.5">
          ›
        </span>
      </Link>

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

function SpendHero({ summary: s }: { summary: MonthSummary }) {
  const left = daysLeft(s.month);
  const change = s.previousTotal > 0 ? Math.round(((s.total - s.previousTotal) / s.previousTotal) * 100) : null;
  return (
    <section className="rounded-xl bg-accent p-5 text-text-inverse shadow-card">
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
