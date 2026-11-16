"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Target, TriangleAlert } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { CategoryBadge } from "@/components/ui/icons";
import { Card, ErrorBanner, SkeletonRows } from "@/components/ui/Card";
import { MonthSwitcher } from "@/components/ui/MonthSwitcher";
import { Toast, useToast } from "@/components/ui/Toast";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { currentMonth, monthLabel, shiftMonth } from "@/lib/dates";
import type { BudgetLine, BudgetView, SavingsView } from "@/lib/ledger";
import { SavingsCard } from "@/components/savings/SavingsCard";
import { SavingsSheet } from "@/components/savings/SavingsSheet";
import { formatTaka } from "@/lib/money";
import { useApiData } from "@/lib/use-api-data";
import { BudgetBar, BudgetLabel, StatusDot } from "./BudgetBar";
import { BudgetSheet } from "./BudgetSheet";

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

export function BudgetsScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { request } = useAuth();
  const thisMonth = currentMonth();
  const month = MONTH.test(params.get("month") ?? "") ? params.get("month")! : thisMonth;
  const lastMonth = shiftMonth(month, -1);

  const view = useApiData<BudgetView>(`/budgets?month=${month}`);
  const previous = useApiData<BudgetView>(`/budgets?month=${lastMonth}`);
  const savings = useApiData<SavingsView>(`/savings-goals?month=${month}`);
  const [editingSavings, setEditingSavings] = useState<SavingsView | null>(null);
  const toast = useToast();
  const [editing, setEditing] = useState<BudgetLine | null>(null);
  const [copying, setCopying] = useState(false);

  const setMonth = (m: string) =>
    router.replace(m === thisMonth ? pathname : `${pathname}?month=${m}`, { scroll: false });

  const v = view.data;
  // Hide last month's numbers while the new month loads.
  const monthSavings = savings.data?.month === month ? savings.data : null;
  const budgeted = v?.lines.filter((l) => l.planned !== null) ?? [];
  const unbudgeted = v?.lines.filter((l) => l.planned === null) ?? [];
  const canCopy = budgeted.length === 0 && (previous.data?.planned ?? 0) > 0;

  async function copyLastMonth() {
    setCopying(true);
    try {
      const { copied } = await request<{ copied: number }>("/budgets/copy", {
        method: "POST",
        body: { from: lastMonth, to: month },
      });
      view.reload();
      toast.show(`Copied ${copied} ${copied === 1 ? "budget" : "budgets"} from ${monthLabel(lastMonth, { short: true })}`);
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "Couldn't copy budgets");
    } finally {
      setCopying(false);
    }
  }

  return (
    <AppShell title="Budgets">
      <MonthSwitcher
        month={month}
        onChange={setMonth}
        maxMonth={shiftMonth(thisMonth, 1)}
        caption={month > thisMonth ? "Planning ahead" : undefined}
      />

      {view.error && <ErrorBanner message={view.error} onRetry={view.reload} />}

      {!v ? (
        <Card>
          <SkeletonRows rows={4} />
        </Card>
      ) : (
        <div className={`flex flex-col gap-4 transition-opacity ${view.status === "loading" ? "opacity-60" : ""}`}>
          {v.planned > 0 ? (
            <OverallCard view={v} />
          ) : (
            <Card>
              <EmptyState
                icon={Target}
                title={`No budgets for ${monthLabel(month)} yet.`}
                text={
                  canCopy
                    ? `Reuse last month's plan, or set a budget for your biggest category below.`
                    : "Set a budget for your biggest category to start."
                }
              >
                {canCopy && (
                  <Button onClick={copyLastMonth} disabled={copying}>
                    {copying ? "Copying…" : `Copy ${monthLabel(lastMonth, { short: true })} budgets (${formatTaka(previous.data!.planned)})`}
                  </Button>
                )}
              </EmptyState>
            </Card>
          )}

          {monthSavings && <SavingsCard savings={monthSavings} onEdit={() => setEditingSavings(monthSavings)} />}

          {budgeted.length > 0 && (
            <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3" aria-label="Budgets">
              {budgeted.map((line) => (
                <li key={line.categoryId}>
                  <button
                    type="button"
                    onClick={() => setEditing(line)}
                    className="block w-full rounded-xl bg-surface p-4 text-left shadow-card hover:ring-2 hover:ring-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  >
                    <span className="mb-2 flex items-center gap-3">
                      <CategoryBadge icon={line.icon} />
                      <span className="flex-1 font-semibold">{line.name}</span>
                      <span className="text-right font-mono tabular-nums">
                        <span className="font-semibold">{formatTaka(line.spent)}</span>
                        <span className="text-sm text-text-muted"> of {formatTaka(line.planned!)}</span>
                      </span>
                    </span>
                    <BudgetBar spent={line.spent} planned={line.planned!} status={line.status} />
                    <span className="mt-1.5 block text-sm">
                      <BudgetLabel status={line.status} remaining={line.remaining!} percent={line.percent!} />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {unbudgeted.length > 0 && (
            <Card title="Not budgeted">
              <ul className="divide-y divide-border">
                {unbudgeted.map((line) => (
                  <li key={line.categoryId} className="flex items-center gap-3 py-2.5">
                    <CategoryBadge icon={line.icon} className="size-9" />
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">{line.name}</span>
                      <span className="block text-sm text-text-muted">
                        {line.spent > 0 ? `${formatTaka(line.spent)} spent` : "Nothing spent"}
                      </span>
                    </span>
                    <Button variant="secondary" size="sm" onClick={() => setEditing(line)}>
                      Set budget
                    </Button>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}

      <BudgetSheet
        line={editing}
        month={month}
        onClose={() => setEditing(null)}
        onSaved={(message) => {
          setEditing(null);
          view.reload();
          toast.show(message);
        }}
      />
      <SavingsSheet
        savings={editingSavings}
        onClose={() => setEditingSavings(null)}
        onSaved={(message) => {
          setEditingSavings(null);
          savings.reload();
          toast.show(message);
        }}
      />
      <Toast message={toast.message} />
    </AppShell>
  );
}

function OverallCard({ view: v }: { view: BudgetView }) {
  const percent = Math.floor((v.spentOnBudgeted * 100) / v.planned);
  const status = v.spentOnBudgeted >= v.planned ? "over" : percent >= 80 ? "near" : "under";
  const over = v.lines.filter((l) => l.status === "over").length;
  const near = v.lines.filter((l) => l.status === "near").length;
  return (
    <section className="rounded-xl bg-surface p-5 shadow-card">
      <p className="text-sm text-text-muted">Spent in budgeted categories</p>
      <p className="mt-1 font-mono tabular-nums">
        <span className="text-3xl font-bold">{formatTaka(v.spentOnBudgeted)}</span>
        <span className="text-text-muted"> of {formatTaka(v.planned)}</span>
      </p>
      <div className="mt-3">
        <BudgetBar spent={v.spentOnBudgeted} planned={v.planned} status={status} size="lg" />
      </div>
      <p className="mt-2 text-sm">
        <BudgetLabel status={status} remaining={Math.round((v.planned - v.spentOnBudgeted) * 100) / 100} percent={percent} />
      </p>
      {(over > 0 || near > 0) && (
        <p className="mt-3 flex flex-wrap gap-2 text-sm">
          {over > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-danger/10 px-3 py-1 font-medium text-danger">
              <TriangleAlert aria-hidden size={14} />
              {over} over budget
            </span>
          )}
          {near > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/15 px-3 py-1 font-medium">
              <StatusDot className="bg-warning" />
              {near} nearly there
            </span>
          )}
        </p>
      )}
      {v.spent > v.spentOnBudgeted && (
        <p className="mt-3 text-sm text-text-muted">
          Plus {formatTaka(Math.round((v.spent - v.spentOnBudgeted) * 100) / 100)} in categories without a budget.
        </p>
      )}
    </section>
  );
}
