"use client";

import { ReceiptText } from "lucide-react";
import { BudgetBar, BudgetLabel, budgetStatusFor } from "@/components/budgets/BudgetBar";
import { Card, SkeletonRows } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { CATEGORY_ICON_OPTIONS, CategoryIcon } from "@/components/ui/icons";
import { monthLabel } from "@/lib/dates";
import type { GroupDetail, GroupExpense, GroupSummary } from "@/lib/group";
import { formatTaka } from "@/lib/money";
import { GroupExpenseRow } from "./ExpensesTab";

const label = (key: string) => CATEGORY_ICON_OPTIONS.find((o) => o.key === key)?.label ?? "Other";

/** Group dashboard for a month (PRD v4 §6.13): totals, my part, budget, categories, people. */
export function OverviewTab({
  group,
  summary: s,
  onOpenExpense,
  onShowAll,
}: {
  group: GroupDetail;
  summary: GroupSummary | null;
  onOpenExpense: (e: GroupExpense) => void;
  onShowAll: () => void;
}) {
  if (!s) {
    return (
      <Card>
        <SkeletonRows rows={4} />
      </Card>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2 lg:items-start lg:gap-6">
      <section className="rounded-xl bg-accent p-5 text-text-inverse shadow-card">
        <p className="text-sm opacity-90">
          {group.name} spent in {monthLabel(s.month, { short: true })}
        </p>
        <p className="mt-1 font-mono text-4xl font-bold tabular-nums">{formatTaka(s.total)}</p>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="opacity-90">Your share</dt>
            <dd className="font-mono text-lg font-semibold tabular-nums">{formatTaka(s.myShare)}</dd>
          </div>
          <div>
            <dt className="opacity-90">You paid</dt>
            <dd className="font-mono text-lg font-semibold tabular-nums">{formatTaka(s.iPaid)}</dd>
          </div>
        </dl>
      </section>

      <Card title="Group budget">
        {s.budget.planned === null ? (
          <p className="py-2 text-sm text-text-muted">
            No monthly budget set.{" "}
            {group.myRole === "OWNER" ? "Set one in the Members tab, under Group settings." : "An owner can set one."}
          </p>
        ) : (
          <div className="pt-1">
            <p className="mb-1.5 flex items-baseline justify-between font-mono tabular-nums">
              <span className="font-semibold">{formatTaka(s.budget.spent)}</span>
              <span className="text-sm text-text-muted">of {formatTaka(s.budget.planned)}</span>
            </p>
            <BudgetBar spent={s.budget.spent} planned={s.budget.planned} status={budgetStatusFor(s.budget.spent, s.budget.planned)} size="lg" />
            <p className="mt-1 text-xs">
              <BudgetLabel
                status={budgetStatusFor(s.budget.spent, s.budget.planned)}
                remaining={s.budget.remaining!}
                percent={Math.floor(s.budget.percent!)}
              />
            </p>
          </div>
        )}
      </Card>

      {s.count === 0 ? (
        <Card className="lg:col-span-2">
          <EmptyState
            icon={ReceiptText}
            title={`Nothing shared in ${monthLabel(s.month)} yet.`}
            text="Add a shared expense with the + button. PocketPlan splits it and keeps track of who owes whom."
          />
        </Card>
      ) : (
        <>
          <Card title="By category">
            <ul className="flex flex-col gap-1">
              {s.byCategory.map((c, i) => (
                <li key={c.category} className="px-1 py-2">
                  <span className="flex items-center gap-2">
                    <CategoryIcon icon={c.category} size={18} className="text-text-muted" />
                    <span className="flex-1 font-medium">{label(c.category)}</span>
                    <span className="text-sm text-text-muted">{c.share}%</span>
                    <span className="w-24 text-right font-mono font-semibold tabular-nums">{formatTaka(c.total)}</span>
                  </span>
                  <span aria-hidden className="mt-1.5 block h-2 overflow-hidden rounded-full bg-surface-muted">
                    <span
                      className="block h-full rounded-full"
                      style={{ width: `${Math.max(c.share, 2)}%`, background: `var(--chart-${(i % 6) + 1})` }}
                    />
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          <Card title="By person">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-text-muted">
                  <th scope="col" className="py-2 font-medium">Person</th>
                  <th scope="col" className="py-2 text-right font-medium">Paid</th>
                  <th scope="col" className="py-2 text-right font-medium">Their share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {s.byMember.map((m) => (
                  <tr key={m.userId}>
                    <th scope="row" className="py-2.5 text-left font-medium">
                      {m.name}
                      {!m.active && <span className="font-normal text-text-muted"> (left)</span>}
                    </th>
                    <td className="py-2.5 text-right font-mono tabular-nums">{formatTaka(m.paid)}</td>
                    <td className="py-2.5 text-right font-mono tabular-nums">{formatTaka(m.share)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <Card
            title="Recent"
            className="lg:col-span-2"
            aside={
              <button type="button" onClick={onShowAll} className="text-sm font-semibold text-accent hover:underline">
                All {s.count}
              </button>
            }
          >
            <ul className="divide-y divide-border">
              {s.recent.map((e) => (
                <GroupExpenseRow key={e.id} expense={e} group={group} onOpen={onOpenExpense} />
              ))}
            </ul>
          </Card>
        </>
      )}
    </div>
  );
}
