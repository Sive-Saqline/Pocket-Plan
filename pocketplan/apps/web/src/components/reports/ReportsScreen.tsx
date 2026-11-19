"use client";

import { ChartColumnBig, CircleCheck } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { AppShell } from "@/components/app/AppShell";
import { BudgetBar, BudgetLabel } from "@/components/budgets/BudgetBar";
import { inputClass } from "@/components/expenses/Pickers";
import { Card, ErrorBanner, SkeletonRows } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { CATEGORY_ICON_OPTIONS, CategoryIcon, WalletIcon } from "@/components/ui/icons";
import { MonthSwitcher } from "@/components/ui/MonthSwitcher";
import { currentMonth, monthLabel, shiftMonth } from "@/lib/dates";
import type { GroupListItem } from "@/lib/group";
import { formatTaka } from "@/lib/money";
import {
  RANGE_OPTIONS,
  type GroupReport,
  type PersonalReport,
  type RangeMonths,
  type Report,
  type ShareRow,
} from "@/lib/reports";
import { useApiData } from "@/lib/use-api-data";
import { ShareList } from "./ShareList";
import { TrendChart } from "./TrendChart";

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const DEFAULT_RANGE: RangeMonths = 6;
const groupCategoryLabel = (key: string) => CATEGORY_ICON_OPTIONS.find((o) => o.key === key)?.label ?? "Other";

function rangeLabel(from: string, to: string) {
  return from === to ? monthLabel(to) : `${monthLabel(from, { short: true })} – ${monthLabel(to, { short: true })}`;
}

/** EXPERIENCE.md §2.3 Reports: by category, by wallet, monthly trend, budget use, savings progress. */
export function ReportsScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const thisMonth = currentMonth();

  // Choices live in the URL so they survive reloads and can be linked to.
  const to = MONTH.test(params.get("to") ?? "") && params.get("to")! <= thisMonth ? params.get("to")! : thisMonth;
  const rangeParam = Number(params.get("months"));
  const range = (RANGE_OPTIONS as readonly number[]).includes(rangeParam) ? (rangeParam as RangeMonths) : DEFAULT_RANGE;
  const groupId = params.get("group");
  const from = shiftMonth(to, -(range - 1));

  const groups = useApiData<GroupListItem[]>("/groups");
  const query = `/reports?from=${from}&to=${to}${groupId ? `&group_id=${groupId}` : ""}`;
  const report = useApiData<Report>(query);

  function update(next: { to?: string; months?: number; group?: string | null }) {
    const q = new URLSearchParams(params.toString());
    const set = (key: string, value: string | null, fallback: string | null) =>
      value === null || value === fallback ? q.delete(key) : q.set(key, value);
    if (next.to !== undefined) set("to", next.to, thisMonth);
    if (next.months !== undefined) set("months", String(next.months), String(DEFAULT_RANGE));
    if (next.group !== undefined) set("group", next.group, null);
    const s = q.toString();
    router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false });
  }

  const r = report.data;
  // Keep showing the previous numbers while new ones load, but say so.
  const stale = report.status === "loading" && r !== null;

  return (
    <AppShell title="Reports">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="lg:w-80">
          <MonthSwitcher
            month={to}
            onChange={(m) => update({ to: m })}
            caption={range > 1 ? rangeLabel(from, to) : undefined}
          />
        </div>
        <div role="group" aria-label="How many months" className="grid grid-cols-4 rounded-xl bg-surface p-1 shadow-card lg:w-80">
          {RANGE_OPTIONS.map((n) => (
            <button
              key={n}
              type="button"
              aria-pressed={range === n}
              onClick={() => update({ months: n })}
              className={`h-11 rounded-lg text-sm font-medium focus-visible:outline-2 focus-visible:outline-accent ${
                range === n ? "bg-accent text-text-inverse" : "text-text-muted hover:bg-surface-muted hover:text-text"
              }`}
            >
              {n === 1 ? "1 month" : `${n} mo`}
            </button>
          ))}
        </div>
        {(groups.data?.length ?? 0) > 0 && (
          <label className="flex flex-col gap-1 lg:ml-auto lg:w-64">
            <span className="sr-only">Show reports for</span>
            <select
              value={groupId ?? ""}
              onChange={(e) => update({ group: e.target.value || null })}
              className={`${inputClass} shadow-card`}
            >
              <option value="">My spending</option>
              {groups.data!.map((g) => (
                <option key={g.id} value={g.id}>
                  Group: {g.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {report.error && <ErrorBanner message={report.error} onRetry={report.reload} />}

      {!r ? (
        !report.error && (
          <Card>
            <SkeletonRows rows={5} />
          </Card>
        )
      ) : (
        <div
          aria-busy={stale}
          className={`grid gap-4 transition-opacity lg:grid-cols-2 lg:gap-6 ${stale ? "opacity-60" : ""}`}
        >
          <TotalCard report={r} />
          {r.count === 0 ? (
            <Card>
              <EmptyState
                icon={ChartColumnBig}
                title={`No spending in ${rangeLabel(r.from, r.to)}.`}
                text={
                  r.scope === "group"
                    ? "Shared expenses added to this group will show up here."
                    : "Expenses you add will show up here, broken down by category, wallet and month."
                }
              />
            </Card>
          ) : (
            <>
              {r.months.length > 1 && (
                <Card title="Monthly trend">
                  <TrendChart points={r.trend} />
                </Card>
              )}
              <Card title="By category">
                <ShareList
                  items={r.byCategory.map((c: ShareRow & { name?: string }) => ({
                    id: c.id,
                    // group categories are fixed icon keys; personal ones have names
                    name: c.name ?? groupCategoryLabel(c.icon),
                    icon: <CategoryIcon icon={c.icon} size={18} />,
                    total: c.total,
                    share: c.share,
                  }))}
                />
              </Card>
              {r.scope === "personal" ? <WalletsCard report={r} /> : <PeopleCard report={r} />}
            </>
          )}
          {r.scope === "personal" ? <BudgetCard report={r} /> : <GroupBudgetCard report={r} />}
          {r.scope === "personal" && <SavingsProgressCard report={r} />}
        </div>
      )}
    </AppShell>
  );
}

function TotalCard({ report: r }: { report: Report }) {
  const months = r.months.length;
  return (
    <Card title={r.scope === "group" ? `${r.group.name}: total spent` : "Total spent"}>
      <p className="font-mono text-3xl font-semibold tabular-nums">{formatTaka(r.total)}</p>
      <p className="mt-1 text-sm text-text-muted">
        {r.count} {r.count === 1 ? "expense" : "expenses"} in {rangeLabel(r.from, r.to)}
      </p>
      <dl className="mt-3 grid grid-cols-2 gap-3 border-t border-border pt-3 text-sm">
        {months > 1 && (
          <div>
            <dt className="text-text-muted">Average per month</dt>
            <dd className="font-mono font-semibold tabular-nums">{formatTaka(Math.round((r.total / months) * 100) / 100)}</dd>
          </div>
        )}
        {r.scope === "group" && (
          <div>
            <dt className="text-text-muted">Your share</dt>
            <dd className="font-mono font-semibold tabular-nums">{formatTaka(r.myShare)}</dd>
          </div>
        )}
        {r.scope === "personal" && (
          <div>
            <dt className="text-text-muted">Personal only</dt>
            <dd className="text-text-muted">
              Group shares are on <Link href="/groups" className="font-medium text-accent hover:underline">Groups</Link>
            </dd>
          </div>
        )}
      </dl>
    </Card>
  );
}

function WalletsCard({ report: r }: { report: PersonalReport }) {
  return (
    <Card title="By wallet">
      <ShareList
        items={r.byWallet.map((w) => ({
          id: w.id,
          name: w.name,
          icon: <WalletIcon type={w.type} size={18} />,
          total: w.total,
          share: w.share,
        }))}
      />
    </Card>
  );
}

function PeopleCard({ report: r }: { report: GroupReport }) {
  return (
    <Card title="By person">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-text-muted">
            <th scope="col" className="py-2 font-medium">Name</th>
            <th scope="col" className="py-2 text-right font-medium">Paid</th>
            <th scope="col" className="py-2 text-right font-medium">Their share</th>
          </tr>
        </thead>
        <tbody>
          {r.byMember.map((m) => (
            <tr key={m.userId} className="border-t border-border">
              <th scope="row" className="py-2 text-left font-medium">
                {m.name}
                {!m.active && <span className="ml-1 font-normal text-text-muted">(left)</span>}
              </th>
              <td className="py-2 text-right font-mono tabular-nums">{formatTaka(m.paid)}</td>
              <td className="py-2 text-right font-mono font-semibold tabular-nums">{formatTaka(m.share)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function BudgetCard({ report: r }: { report: PersonalReport }) {
  const b = r.budget;
  return (
    <Card title="Budget use" aside={b.percent !== null && <OverallPercent percent={b.percent} />}>
      {b.lines.length === 0 ? (
        <NoneSet text="No budgets set for these months.">
          <Link href={`/budgets?month=${r.to}`} className="font-medium text-accent hover:underline">
            Set a budget
          </Link>
        </NoneSet>
      ) : (
        <>
          <p className="mb-2 text-sm text-text-muted">
            <span className="font-mono tabular-nums">{formatTaka(b.spent)}</span> of{" "}
            <span className="font-mono tabular-nums">{formatTaka(b.planned)}</span> planned
            {r.months.length > 1 && " (only months with a budget count)"}
          </p>
          <ul className="flex flex-col">
            {b.lines.map((l) => (
              <li key={l.categoryId} className="flex flex-col gap-1.5 border-t border-border py-3 first:border-t-0">
                <span className="flex items-center gap-2">
                  <CategoryIcon icon={l.icon} size={18} className="text-text-muted" />
                  <span className="min-w-0 flex-1 truncate font-medium">{l.name}</span>
                  <span className="font-mono text-sm tabular-nums">
                    {formatTaka(l.spent)} <span className="text-text-muted">/ {formatTaka(l.planned)}</span>
                  </span>
                </span>
                <BudgetBar spent={l.spent} planned={l.planned} status={l.status} />
                <span className="text-sm">
                  <BudgetLabel status={l.status} remaining={l.remaining} percent={l.percent} />
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}

function GroupBudgetCard({ report: r }: { report: GroupReport }) {
  const b = r.budget;
  return (
    <Card title="Budget use" aside={b.percent !== null && <OverallPercent percent={b.percent} />}>
      {b.planned === null ? (
        <NoneSet text="This group has no monthly budget.">
          <Link href={`/groups/${r.group.id}`} className="font-medium text-accent hover:underline">
            Open the group
          </Link>
        </NoneSet>
      ) : (
        <div className="flex flex-col gap-1.5">
          <p className="font-mono text-sm tabular-nums">
            {formatTaka(b.spent)} <span className="text-text-muted">/ {formatTaka(b.planned)}</span>
          </p>
          <BudgetBar spent={b.spent} planned={b.planned} status={b.status} size="lg" />
          <span className="text-sm">
            <BudgetLabel status={b.status} remaining={Math.round((b.planned - b.spent) * 100) / 100} percent={b.percent!} />
          </span>
          {r.months.length > 1 && (
            <p className="text-sm text-text-muted">The group&apos;s monthly budget × {r.months.length} months.</p>
          )}
        </div>
      )}
    </Card>
  );
}

function SavingsProgressCard({ report: r }: { report: PersonalReport }) {
  const s = r.savings;
  const name = s.category?.name ?? "Savings";
  if (s.target === null && s.saved === 0) {
    return (
      <Card title="Savings progress">
        <NoneSet text="No savings target for these months.">
          <Link href={`/budgets?month=${r.to}`} className="font-medium text-accent hover:underline">
            Set a target
          </Link>
        </NoneSet>
      </Card>
    );
  }
  const percent = s.percent ?? 0;
  return (
    <Card title="Savings progress" aside={s.percent !== null && <OverallPercent percent={s.percent} />}>
      <p className="font-mono text-sm tabular-nums">
        Saved {formatTaka(s.saved)}
        {s.target !== null && <span className="text-text-muted"> of {formatTaka(s.target)} target</span>}
      </p>
      {s.target !== null && (
        <div
          role="meter"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.min(percent, 100)}
          aria-valuetext={`${percent}% of the savings target`}
          className="mt-2 h-2.5 overflow-hidden rounded-full bg-surface-muted"
        >
          <div className="h-full rounded-full bg-success" style={{ width: `${Math.min(Math.max(percent, 1), 100)}%` }} />
        </div>
      )}
      <p className="mt-1.5 text-sm text-text-muted">
        {s.status === "reached" ? (
          <span className="inline-flex items-center gap-1 font-medium text-success">
            <CircleCheck aria-hidden size={14} /> Target reached
          </span>
        ) : s.target !== null ? (
          `${formatTaka(Math.max(Math.round((s.target - s.saved) * 100) / 100, 0))} to go`
        ) : (
          "No target set for these months"
        )}
        {" · "}counted from your “{name}” expenses
      </p>
      {r.months.length > 1 && (
        <table className="mt-3 w-full text-sm">
          <thead>
            <tr className="text-left text-text-muted">
              <th scope="col" className="py-1.5 font-medium">Month</th>
              <th scope="col" className="py-1.5 text-right font-medium">Saved</th>
              <th scope="col" className="py-1.5 text-right font-medium">Target</th>
            </tr>
          </thead>
          <tbody>
            {s.months.map((m) => (
              <tr key={m.month} className="border-t border-border">
                <th scope="row" className="py-1.5 text-left font-normal">{monthLabel(m.month, { short: true })}</th>
                <td className="py-1.5 text-right font-mono tabular-nums">{formatTaka(m.saved)}</td>
                <td className="py-1.5 text-right font-mono tabular-nums text-text-muted">
                  {m.target === null ? "—" : formatTaka(m.target)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}

function OverallPercent({ percent }: { percent: number }) {
  return <span className="font-mono text-sm font-semibold tabular-nums">{percent}%</span>;
}

function NoneSet({ text, children }: { text: string; children: ReactNode }) {
  return (
    <p className="text-sm text-text-muted">
      {text} {children}
    </p>
  );
}
