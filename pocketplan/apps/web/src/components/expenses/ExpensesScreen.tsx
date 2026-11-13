"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { AppShell, Fab } from "@/components/app/AppShell";
import { Card, ErrorBanner, SkeletonRows } from "@/components/ui/Card";
import { Toast, useToast } from "@/components/ui/Toast";
import { MonthSwitcher } from "@/components/ui/MonthSwitcher";
import { currentMonth, dayLabel, monthLabel } from "@/lib/dates";
import type { Expense } from "@/lib/ledger";
import { formatTaka } from "@/lib/money";
import { useApiData } from "@/lib/use-api-data";
import { usePersonalData } from "@/lib/use-personal-data";
import { ExpenseRow } from "./ExpenseRow";
import { ExpenseSheet } from "./ExpenseSheet";

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

export function ExpensesScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const thisMonth = currentMonth();
  const month = MONTH.test(params.get("month") ?? "") ? params.get("month")! : thisMonth;
  const categoryId = params.get("category");

  const personal = usePersonalData();
  const query = new URLSearchParams({ month, ...(categoryId && { categoryId }) });
  const expenses = useApiData<Expense[]>(`/expenses?${query}`);
  const toast = useToast();
  const [sheet, setSheet] = useState<{ open: boolean; expense: Expense | null }>({ open: false, expense: null });

  // Filters live in the URL so they survive reloads and can be linked to.
  const setParams = (next: { month?: string; category?: string | null }) => {
    const p = new URLSearchParams(params.toString());
    if (next.month !== undefined) {
      if (next.month === thisMonth) p.delete("month");
      else p.set("month", next.month);
    }
    if (next.category !== undefined) {
      if (next.category) p.set("category", next.category);
      else p.delete("category");
    }
    const qs = p.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const days = useMemo(() => {
    const groups = new Map<string, Expense[]>();
    for (const e of expenses.data ?? []) {
      groups.set(e.expenseDate, [...(groups.get(e.expenseDate) ?? []), e]);
    }
    return [...groups].map(([date, items]) => ({
      date,
      items,
      total: items.reduce((t, e) => t + Math.round(e.amount * 100), 0) / 100,
    }));
  }, [expenses.data]);
  const total = days.reduce((t, d) => t + Math.round(d.total * 100), 0) / 100;
  const activeCategory = categoryId ? personal.categoryById(categoryId) : undefined;

  return (
    <AppShell title="Expenses">
      <MonthSwitcher
        month={month}
        onChange={(m) => setParams({ month: m })}
        caption={
          expenses.data
            ? `${formatTaka(total)} · ${expenses.data.length} ${expenses.data.length === 1 ? "expense" : "expenses"}`
            : "…"
        }
      />

      <div role="group" aria-label="Filter by category" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        <FilterChip label="All" active={!categoryId} onClick={() => setParams({ category: null })} />
        {personal.categories.map((c) => (
          <FilterChip
            key={c.id}
            label={`${c.icon} ${c.name}`}
            active={c.id === categoryId}
            onClick={() => setParams({ category: c.id === categoryId ? null : c.id })}
          />
        ))}
      </div>

      {expenses.error && <ErrorBanner message={expenses.error} onRetry={expenses.reload} />}

      {!expenses.data ? (
        <Card>
          <SkeletonRows rows={5} />
        </Card>
      ) : days.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <span aria-hidden className="text-3xl">
              {activeCategory?.icon ?? "🧾"}
            </span>
            <p className="font-medium">
              {activeCategory
                ? `No ${activeCategory.name} expenses in ${monthLabel(month)}.`
                : `No expenses in ${monthLabel(month)}.`}
            </p>
            <p className="text-sm text-text-muted">Tap + to add one.</p>
          </div>
        </Card>
      ) : (
        <div className={`flex flex-col gap-3 transition-opacity ${expenses.status === "loading" ? "opacity-60" : ""}`}>
          {days.map((day) => (
            <Card key={day.date}>
              <header className="mb-1 flex items-center justify-between px-1">
                <h2 className="text-sm font-semibold text-text-muted">{dayLabel(day.date)}</h2>
                <span className="font-mono text-sm font-semibold text-text-muted tabular-nums">{formatTaka(day.total)}</span>
              </header>
              <ul>
                {day.items.map((e) => (
                  <ExpenseRow
                    key={e.id}
                    expense={e}
                    category={personal.categoryById(e.categoryId)}
                    wallet={personal.walletById(e.accountId)}
                    onSelect={(expense) => setSheet({ open: true, expense })}
                  />
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}

      <Fab label="Add expense" onClick={() => setSheet({ open: true, expense: null })} />
      <ExpenseSheet
        open={sheet.open}
        expense={sheet.expense}
        categories={personal.categories}
        wallets={personal.wallets}
        onClose={() => setSheet({ open: false, expense: null })}
        onSaved={(e, created) => {
          setSheet({ open: false, expense: null });
          expenses.reload();
          toast.show(`${created ? "Added" : "Updated"} ${formatTaka(e.amount)}${e.description ? ` · ${e.description}` : ""}`);
        }}
        onDeleted={(e) => {
          setSheet({ open: false, expense: null });
          expenses.reload();
          toast.show(`Deleted ${formatTaka(e.amount)} expense`);
        }}
        onWalletCreated={personal.reloadWallets}
      />
      <Toast message={toast.message} />
    </AppShell>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`h-10 shrink-0 rounded-full border px-4 text-sm font-medium whitespace-nowrap ${
        active ? "border-accent bg-accent text-text-inverse" : "border-border bg-surface hover:bg-surface-muted"
      }`}
    >
      {label}
    </button>
  );
}
