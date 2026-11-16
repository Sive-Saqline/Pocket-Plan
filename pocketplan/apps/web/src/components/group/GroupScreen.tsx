"use client";

import { ArrowLeft, SearchX } from "lucide-react";
import Link from "next/link";
import { useCallback, useState } from "react";
import { AppShell, Fab } from "@/components/app/AppShell";
import { buttonClass } from "@/components/ui/Button";
import { Card, ErrorBanner, SkeletonRows } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { MonthSwitcher } from "@/components/ui/MonthSwitcher";
import { Toast, useToast } from "@/components/ui/Toast";
import { useAuth } from "@/lib/auth";
import { currentMonth } from "@/lib/dates";
import type { Balances, GroupDetail, GroupExpense, GroupSummary } from "@/lib/group";
import { formatTaka } from "@/lib/money";
import { useApiData } from "@/lib/use-api-data";
import { BalancesTab } from "./BalancesTab";
import { ExpensesTab } from "./ExpensesTab";
import { GroupExpenseSheet } from "./GroupExpenseSheet";
import { MembersTab } from "./MembersTab";
import { OverviewTab } from "./OverviewTab";

const tabs = [
  { key: "overview", label: "Overview" },
  { key: "expenses", label: "Expenses" },
  { key: "balances", label: "Balances" },
  { key: "members", label: "Members" },
] as const;
type Tab = (typeof tabs)[number]["key"];

/** One group: dashboard, shared expenses, balances & settle up, members & invites. */
export function GroupScreen({ groupId }: { groupId: string }) {
  const [tab, setTab] = useState<Tab>("overview");
  const [month, setMonth] = useState(currentMonth());
  const toast = useToast();
  const [sheet, setSheet] = useState<{ open: boolean; expense: GroupExpense | null }>({ open: false, expense: null });

  const base = `/groups/${groupId}`;
  const group = useApiData<GroupDetail>(base);
  const summary = useApiData<GroupSummary>(`${base}/summary?month=${month}`);
  const expenses = useApiData<GroupExpense[]>(`${base}/expenses?month=${month}`);
  const balances = useApiData<Balances>(`${base}/balances`);

  const { reload: reloadGroup } = group;
  const { reload: reloadSummary } = summary;
  const { reload: reloadExpenses } = expenses;
  const { reload: reloadBalances } = balances;
  const refresh = useCallback(() => {
    reloadGroup();
    reloadSummary();
    reloadExpenses();
    reloadBalances();
  }, [reloadGroup, reloadSummary, reloadExpenses, reloadBalances]);

  const done = (message: string) => {
    setSheet({ open: false, expense: null });
    refresh();
    toast.show(message);
  };

  // 404 = not a member (or no such group): say so plainly.
  if (group.status === "error" && !group.data && group.error === "Group not found") {
    return (
      <AppShell title="Group">
        <Card>
          <EmptyState icon={SearchX} title="Group not found" text="It may have been deleted, or you're no longer a member.">
            <Link href="/groups" className={buttonClass("secondary")}>
              Back to groups
            </Link>
          </EmptyState>
        </Card>
      </AppShell>
    );
  }

  const g = group.data;
  const error = group.error ?? summary.error ?? expenses.error ?? balances.error;

  return (
    <AppShell title={g?.name ?? "Group"}>
      <div className="flex items-center gap-2">
        <Link
          href="/groups"
          className="inline-flex h-9 items-center gap-1 rounded-lg px-2 text-sm font-medium text-text-muted hover:bg-surface-muted hover:text-text"
        >
          <ArrowLeft aria-hidden size={16} />
          All groups
        </Link>
        {balances.data && g && <MyBalance balances={balances.data} />}
      </div>

      {error && <ErrorBanner message={error} onRetry={refresh} />}

      <div role="tablist" aria-label="Group sections" className="grid grid-cols-4 gap-1 rounded-xl bg-surface p-1 shadow-card">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            id={`tab-${t.key}`}
            aria-selected={tab === t.key}
            aria-controls={`panel-${t.key}`}
            onClick={() => setTab(t.key)}
            className={`h-10 rounded-lg text-sm font-medium focus-visible:outline-2 focus-visible:outline-accent ${
              tab === t.key ? "bg-accent text-text-inverse" : "text-text-muted hover:bg-surface-muted hover:text-text"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="flex flex-col gap-4 lg:gap-6">
        {!g ? (
          <Card>
            <SkeletonRows rows={4} />
          </Card>
        ) : (
          <>
            {(tab === "overview" || tab === "expenses") && <MonthSwitcher month={month} onChange={setMonth} />}
            {tab === "overview" && (
              <OverviewTab
                group={g}
                summary={summary.data}
                onOpenExpense={(expense) => setSheet({ open: true, expense })}
                onShowAll={() => setTab("expenses")}
              />
            )}
            {tab === "expenses" && (
              <ExpensesTab
                group={g}
                expenses={expenses.data}
                onOpen={(expense) => setSheet({ open: true, expense })}
                onAdd={() => setSheet({ open: true, expense: null })}
              />
            )}
            {tab === "balances" && <BalancesTab group={g} balances={balances.data} onChanged={done} />}
            {tab === "members" && <MembersTab group={g} balances={balances.data} onChanged={done} />}
          </>
        )}
      </div>

      {g && (
        <>
          <Fab label="Add shared expense" onClick={() => setSheet({ open: true, expense: null })} />
          <GroupExpenseSheet
            open={sheet.open}
            group={g}
            expense={sheet.expense}
            onClose={() => setSheet({ open: false, expense: null })}
            onDone={done}
          />
        </>
      )}
      <Toast message={toast.message} />
    </AppShell>
  );
}

/** My own balance in this group; the Balances tab has everyone's. */
function MyBalance({ balances }: { balances: Balances }) {
  const me = useAuth().state.user?.id;
  const mine = balances.members.find((m) => m.userId === me)?.balance ?? 0;
  return (
    <span
      className={`ml-auto rounded-full px-3 py-1 text-sm font-medium ${
        mine > 0 ? "bg-success/10 text-success" : mine < 0 ? "bg-danger/10 text-danger" : "bg-surface-muted text-text-muted"
      }`}
    >
      {mine > 0 ? `You're owed ${formatTaka(mine)}` : mine < 0 ? `You owe ${formatTaka(-mine)}` : "You're settled up"}
    </span>
  );
}
