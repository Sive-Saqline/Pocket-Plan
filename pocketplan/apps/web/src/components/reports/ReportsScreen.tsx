"use client";

import { ChartColumnBig, CircleCheck, TrendingDown, TrendingUp, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useRef, useState, type ReactNode } from "react";
import { AppShell } from "@/components/app/AppShell";
import { BudgetBar, BudgetLabel } from "@/components/budgets/BudgetBar";
import { AiComposer, AskAiButton } from "@/components/expenses/AiComposer";
import { inputClass } from "@/components/expenses/Pickers";
import { useAuth } from "@/lib/auth";
import type { Category, Wallet } from "@/lib/ledger";
import { downloadText, exportFileName, printReport, reportCsv, type ExportContext } from "@/lib/report-export";
import { DownloadMenu } from "./DownloadMenu";
import { cachedInsight, InsightsCard, rememberInsight } from "./InsightsCard";
import { Card, ErrorBanner, SkeletonRows } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { CATEGORY_ICON_OPTIONS, CategoryIcon, WalletIcon } from "@/components/ui/icons";
import { MonthSwitcher } from "@/components/ui/MonthSwitcher";
import { currentMonth, isoDate, monthLabel, shiftMonth } from "@/lib/dates";
import type { GroupListItem } from "@/lib/group";
import { formatTaka } from "@/lib/money";
import {
  dayCount,
  dayRangeLabel,
  isWholeMonths,
  lastDayOf,
  MAX_DAYS,
  MAX_MONTHS,
  RANGE_OPTIONS,
  type DateRange,
  type GroupReport,
  type PersonalReport,
  type Report,
  type ReportAnswer,
  type ReportView,
  type ShareRow,
} from "@/lib/reports";
import { useApiData } from "@/lib/use-api-data";
import { ShareList } from "./ShareList";
import { TrendChart } from "./TrendChart";
import { DateRangePicker } from "./DateRangePicker";

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const DATE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const DEFAULT_RANGE = 6;

/** A custom range from the URL, if it's a usable one. */
function customRange(start: string | null, end: string | null, today: string): DateRange | null {
  if (!start || !end || !DATE.test(start) || !DATE.test(end)) return null;
  if (start > end || end > today || dayCount({ start, end }) > MAX_DAYS) return null;
  return { start, end };
}

/** "November 2026", "Sep – Nov 2026", or "5 – 20 Nov 2026" for custom days. */
function periodLabel(range: DateRange) {
  return isWholeMonths(range) ? rangeLabel(range.start.slice(0, 7), range.end.slice(0, 7)) : dayRangeLabel(range);
}

/** Number of months from `from` to `to`, inclusive. */
function monthCount(from: string, to: string) {
  const [fy, fm] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  return ty * 12 + tm - (fy * 12 + fm) + 1;
}

/**
 * Range button labels: This month, 3 months, 6 months, 1 year. The single
 * month is "This month" only while the switcher is on the current month; on
 * an earlier month it would be wrong, so it reads "1 month" there.
 */
const rangeName = (n: number, onCurrentMonth: boolean) =>
  n === 12 ? "1 year" : n === 1 ? (onCurrentMonth ? "This month" : "1 month") : `${n} months`;

/** "a,b" in the URL -> ["a", "b"] */
const listParam = (value: string | null) => (value ?? "").split(",").filter(Boolean).slice(0, 30);
const groupCategoryLabel = (key: string) => CATEGORY_ICON_OPTIONS.find((o) => o.key === key)?.label ?? "Other";

function rangeLabel(from: string, to: string) {
  return from === to ? monthLabel(to) : `${monthLabel(from, { short: true })} – ${monthLabel(to, { short: true })}`;
}

/** EXPERIENCE.md §2.3 Reports: by category, by wallet, monthly trend, budget use, savings progress. */
export function ReportsScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { request } = useAuth();
  const thisMonth = currentMonth();

  // Choices live in the URL so they survive reloads and can be linked to.
  const to = MONTH.test(params.get("to") ?? "") && params.get("to")! <= thisMonth ? params.get("to")! : thisMonth;
  const rangeParam = Number(params.get("months"));
  // 1/3/6/12 from the buttons; Ask AI may pick any length up to 12.
  const range = Number.isInteger(rangeParam) && rangeParam >= 1 && rangeParam <= MAX_MONTHS ? rangeParam : DEFAULT_RANGE;
  const groupId = params.get("group");
  const from = shiftMonth(to, -(range - 1));
  // A custom range of days (calendar button) replaces the month presets.
  const today = isoDate();
  const custom = customRange(params.get("start"), params.get("end"), today);
  const shown: DateRange = custom ?? { start: `${from}-01`, end: lastDayOf(to) };
  // Step 20 filters: category ids (keys in a group) and wallet ids.
  const categories = listParam(params.get("cat"));
  const wallets = groupId ? [] : listParam(params.get("wallet"));
  const view: ReportView = { ...shown, groupId, categories, wallets };
  const filtered = categories.length > 0 || wallets.length > 0;

  const groups = useApiData<GroupListItem[]>("/groups");
  const query =
    `/reports?${custom ? `start=${custom.start}&end=${custom.end}` : `from=${from}&to=${to}`}` +
    (groupId ? `&group_id=${groupId}` : "") +
    (categories.length ? `&categories=${categories.map(encodeURIComponent).join(",")}` : "") +
    (wallets.length ? `&wallets=${wallets.map(encodeURIComponent).join(",")}` : "");
  const report = useApiData<Report>(query);
  // Names for the filter chips (only fetched while a personal filter is on).
  const categoryList = useApiData<Category[]>(!groupId && categories.length ? "/categories" : null);
  const walletList = useApiData<Wallet[]>(!groupId && wallets.length ? "/accounts" : null);

  function update(next: {
    to?: string;
    months?: number;
    /** A custom range of days; null goes back to the month presets. */
    custom?: DateRange | null;
    group?: string | null;
    categories?: string[];
    wallets?: string[];
  }) {
    const q = new URLSearchParams(params.toString());
    const set = (key: string, value: string | null, fallback: string | null) =>
      value === null || value === fallback ? q.delete(key) : q.set(key, value);
    if (next.to !== undefined) set("to", next.to, thisMonth);
    if (next.months !== undefined) set("months", String(next.months), String(DEFAULT_RANGE));
    // Picking a month or a preset leaves the custom range.
    const custom = next.custom !== undefined ? next.custom : next.to !== undefined || next.months !== undefined ? null : undefined;
    if (custom !== undefined) {
      set("start", custom?.start ?? null, null);
      set("end", custom?.end ?? null, null);
    }
    if (next.group !== undefined) {
      set("group", next.group, null);
      // personal and group categories differ, so filters don't carry over
      if (next.categories === undefined) q.delete("cat");
      if (next.wallets === undefined) q.delete("wallet");
    }
    if (next.categories !== undefined) set("cat", next.categories.join(",") || null, null);
    if (next.wallets !== undefined) set("wallet", next.wallets.join(",") || null, null);
    const s = q.toString();
    router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false });
  }

  /** Shows a view from Ask AI: whole months as a preset, anything else as custom days. */
  function showView(v: ReportView) {
    const filters = { group: v.groupId, categories: v.categories, wallets: v.wallets };
    const fromMonth = v.start.slice(0, 7);
    const toMonth = v.end.slice(0, 7);
    if (isWholeMonths(v) && toMonth <= thisMonth && monthCount(fromMonth, toMonth) <= MAX_MONTHS) {
      update({ to: toMonth, months: monthCount(fromMonth, toMonth), custom: null, ...filters });
    } else {
      // never after today (a custom range can't run into the future)
      update({ custom: { start: v.start, end: v.end > today ? today : v.end }, ...filters });
    }
  }

  // Tapping a category or wallet row shows only that one; tapping it again shows all.
  const only = (current: string[], id: string) => (current.length === 1 && current[0] === id ? [] : [id]);

  // --- Ask AI (Step 20): a question sets the filters; Undo puts them back.
  const [aiOpen, setAiOpen] = useState(false);
  const [answered, setAnswered] = useState(0);
  const beforeAi = useRef<string | null>(null);

  async function ask(question: string) {
    const res = await request<ReportAnswer>("/ai/report-ask", {
      method: "POST",
      body: { question, ...shown, ...(groupId && { groupId }), categories, wallets, today },
    });
    beforeAi.current ??= params.toString();
    rememberInsight(res.view, { insights: res.insights, question, answer: res.answer });
    showView(res.view);
    setAnswered((n) => n + 1);
    return res.answer || "Report updated. The AI insights card has more.";
  }

  function undoAsk() {
    if (beforeAi.current === null) return;
    const q = beforeAi.current;
    beforeAi.current = null;
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
  }

  const r = report.data;
  // Keep showing the previous numbers while new ones load, but say so.
  const stale = report.status === "loading" && r !== null;

  const categoryName = (id: string) =>
    groupId
      ? groupCategoryLabel(id)
      : (categoryList.data?.find((c) => c.id === id)?.name ?? "Category");
  const walletName = (id: string) => walletList.data?.find((w) => w.id === id)?.name ?? "Wallet";

  // Download: the report as shown, with the same cards hidden as on screen.
  function exportContext(rep: Report): ExportContext {
    return {
      scope: rep.scope === "group" ? `Group: ${rep.group.name}` : "My spending",
      filters: [...categories.map(categoryName), ...wallets.map(walletName)].join(", "),
      categoryName: (c) => c.name ?? groupCategoryLabel(c.icon),
      showBudget: rep.scope === "personal" ? wallets.length === 0 : categories.length === 0,
      showSavings: !filtered,
      insights: cachedInsight(view)?.insights ?? null,
    };
  }
  const ready = !!r && !stale;

  return (
    <AppShell
      title="Reports"
      actions={
        <div className="flex items-center gap-2">
          <DownloadMenu
            disabled={!ready}
            onPdf={() => r && printReport(r, exportContext(r))}
            onCsv={() => r && downloadText(exportFileName(r, "csv"), reportCsv(r, exportContext(r)), "text/csv;charset=utf-8")}
          />
          <AskAiButton open={aiOpen} onClick={() => setAiOpen((o) => !o)} />
        </div>
      }
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="lg:w-80">
          {custom ? (
            <CustomRangeBar range={custom} onChange={(c) => update({ custom: c })} onClear={() => update({ custom: null })} />
          ) : (
            <MonthSwitcher
              month={to}
              onChange={(m) => update({ to: m })}
              caption={range > 1 ? rangeLabel(from, to) : undefined}
              labelAction={<DateRangePicker value={null} onApply={(c) => update({ custom: c })} />}
            />
          )}
        </div>
        <div
          role="group"
          aria-label="How many months"
          className="grid grid-cols-4 gap-1 rounded-xl border border-border bg-surface-muted p-1 lg:w-96"
        >
          {RANGE_OPTIONS.map((n) => (
            <button
              key={n}
              type="button"
              aria-pressed={!custom && range === n}
              onClick={() => update({ months: n })}
              className={`h-10 rounded-lg text-sm transition-colors focus-visible:outline-2 focus-visible:outline-accent ${
                !custom && range === n
                  ? "bg-surface font-semibold text-accent shadow-card"
                  : "font-medium text-text-muted hover:bg-surface/60 hover:text-text"
              }`}
            >
              {rangeName(n, to === thisMonth)}
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

      {aiOpen && (
        <AiComposer
          placeholder="Ask about your spending, e.g. Food in the last 3 months"
          onSend={ask}
          onUndo={undoAsk}
          onClose={() => setAiOpen(false)}
        />
      )}

      {filtered && (
        <div className="flex flex-wrap items-center gap-2" aria-label="Filters">
          <span className="text-sm text-text-muted">Showing only:</span>
          {categories.map((id) => (
            <FilterChip
              key={id}
              label={categoryName(id)}
              onRemove={() => update({ categories: categories.filter((c) => c !== id) })}
            />
          ))}
          {wallets.map((id) => (
            <FilterChip
              key={id}
              label={walletName(id)}
              onRemove={() => update({ wallets: wallets.filter((w) => w !== id) })}
            />
          ))}
          <button
            type="button"
            onClick={() => update({ categories: [], wallets: [] })}
            className="h-9 rounded-full px-2 text-sm font-medium text-accent hover:underline"
          >
            Show all
          </button>
        </div>
      )}

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
          <InsightsCard view={view} empty={r.count === 0} answered={answered} />
          {r.count === 0 ? (
            <Card>
              <EmptyState
                icon={ChartColumnBig}
                title={`No spending in ${periodLabel(r)}.`}
                text={
                  r.scope === "group"
                    ? "Shared expenses added to this group will show up here."
                    : "Expenses you add will show up here, broken down by category, wallet and month."
                }
              />
            </Card>
          ) : (
            <>
              {r.trend.length > 1 && (
                <Card title={r.trendBy === "day" ? "Daily trend" : "Monthly trend"}>
                  <TrendChart points={r.trend} by={r.trendBy} />
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
                  onSelect={(id) => update({ categories: only(categories, id) })}
                />
              </Card>
              {r.scope === "personal" ? (
                <WalletsCard report={r} onSelect={(id) => update({ wallets: only(wallets, id) })} />
              ) : (
                <PeopleCard report={r} />
              )}
            </>
          )}
          {/* A plan compared with part of the spending would mislead, so
              budgets and savings show only for what they cover. */}
          {r.scope === "personal"
            ? wallets.length === 0 && <BudgetCard report={r} />
            : categories.length === 0 && <GroupBudgetCard report={r} />}
          {r.scope === "personal" && !filtered && <SavingsProgressCard report={r} />}
        </div>
      )}
    </AppShell>
  );
}

function TotalCard({ report: r }: { report: Report }) {
  // Whole months average per month; custom days, per day.
  const perMonth = r.wholeMonths && r.months.length > 1;
  const perDay = !r.wholeMonths && r.days > 1;
  return (
    <Card title={r.scope === "group" ? `${r.group.name}: total spent` : "Total spent"}>
      <p className="font-mono text-3xl font-semibold tabular-nums">{formatTaka(r.total)}</p>
      <p className="mt-1 text-sm text-text-muted">
        {r.count} {r.count === 1 ? "expense" : "expenses"} in {periodLabel(r)}
        {!r.wholeMonths && ` (${r.days} ${r.days === 1 ? "day" : "days"})`}
      </p>
      <Comparison report={r} />
      <dl className="mt-3 grid grid-cols-2 gap-3 border-t border-border pt-3 text-sm">
        {(perMonth || perDay) && (
          <div>
            <dt className="text-text-muted">Average per {perMonth ? "month" : "day"}</dt>
            <dd className="font-mono font-semibold tabular-nums">
              {formatTaka(Math.round((r.total / (perMonth ? r.months.length : r.days)) * 100) / 100)}
            </dd>
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

function WalletsCard({ report: r, onSelect }: { report: PersonalReport; onSelect: (id: string) => void }) {
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
        onSelect={onSelect}
      />
    </Card>
  );
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <button
      type="button"
      onClick={onRemove}
      aria-label={`Remove filter: ${label}`}
      className="inline-flex h-9 items-center gap-1.5 rounded-full border border-accent/40 bg-accent/10 pr-2 pl-3 text-sm font-medium hover:bg-accent/15 focus-visible:outline-2 focus-visible:outline-accent"
    >
      {label}
      <X aria-hidden size={14} className="text-text-muted" />
    </button>
  );
}

/** "12% more than Jun – Aug (৳3,000)", in words and an arrow, never colour alone. */
function Comparison({ report: r }: { report: Report }) {
  const p = r.previous;
  const period = periodLabel(p);
  if (p.change === null) {
    return <p className="mt-1 text-sm text-text-muted">Nothing spent in {period} to compare with.</p>;
  }
  const Icon = p.change >= 0 ? TrendingUp : TrendingDown;
  return (
    <p className="mt-1 flex items-center gap-1.5 text-sm text-text-muted">
      <Icon aria-hidden size={16} className="shrink-0" />
      <span>
        {p.change === 0 ? "Same as" : `${Math.abs(p.change)}% ${p.change > 0 ? "more" : "less"} than`} {period} (
        <span className="font-mono tabular-nums">{formatTaka(p.total)}</span>)
      </span>
    </p>
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
      {r.fullMonths.length === 0 ? (
        <MonthlyOnly what="Budgets" />
      ) : b.lines.length === 0 ? (
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
            {!r.wholeMonths
              ? ` (whole months only: ${r.fullMonths.map((m) => monthLabel(m, { short: true })).join(", ")})`
              : r.months.length > 1 && " (only months with a budget count)"}
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
      {r.fullMonths.length === 0 ? (
        <MonthlyOnly what="The group budget" />
      ) : b.planned === null ? (
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
          {(r.fullMonths.length > 1 || !r.wholeMonths) && (
            <p className="text-sm text-text-muted">
              The group&apos;s monthly budget × {r.fullMonths.length} {r.fullMonths.length === 1 ? "month" : "months"}
              {!r.wholeMonths && ", the whole months in this range"}.
            </p>
          )}
        </div>
      )}
    </Card>
  );
}

function SavingsProgressCard({ report: r }: { report: PersonalReport }) {
  const s = r.savings;
  const name = s.category?.name ?? "Savings";
  if (r.fullMonths.length === 0) {
    return (
      <Card title="Savings progress">
        <MonthlyOnly what="Savings targets" />
      </Card>
    );
  }
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
      {s.months.length > 1 && (
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

/** Budgets and savings targets are set per month, so part of a month can't be compared. */
function MonthlyOnly({ what }: { what: string }) {
  return (
    <p className="text-sm text-text-muted">
      {what} are set per month, and this range doesn&apos;t cover a whole month. Pick dates from the 1st to the last
      day of a month to compare.
    </p>
  );
}

/**
 * Shown instead of the month switcher while a custom range is on: the
 * dates, a calendar button to change them, and a way back to months.
 */
function CustomRangeBar({
  range,
  onChange,
  onClear,
}: {
  range: DateRange;
  onChange: (range: DateRange) => void;
  onClear: () => void;
}) {
  const days = dayCount(range);
  return (
    <div className="flex items-center gap-2 rounded-xl bg-surface p-2 shadow-card">
      <DateRangePicker value={range} onApply={onChange} />
      <div className="min-w-0 flex-1 text-center">
        <p className="truncate font-semibold">{dayRangeLabel(range)}</p>
        <p className="text-sm text-text-muted">
          Custom · {days} {days === 1 ? "day" : "days"}
        </p>
      </div>
      <button
        type="button"
        onClick={onClear}
        aria-label="Clear custom dates and go back to months"
        title="Back to months"
        className="grid size-11 place-items-center rounded-lg text-text-muted hover:bg-surface-muted hover:text-text focus-visible:outline-2 focus-visible:outline-accent"
      >
        <X aria-hidden size={20} />
      </button>
    </div>
  );
}
