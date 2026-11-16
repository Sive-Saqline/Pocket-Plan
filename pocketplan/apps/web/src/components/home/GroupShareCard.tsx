"use client";

import { ChevronRight, UsersRound } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { monthLabel } from "@/lib/dates";
import type { MyGroupMonth } from "@/lib/group";
import { formatTaka } from "@/lib/money";
import { useApiData } from "@/lib/use-api-data";

/**
 * My part of group spending this month (GET /reports/groups). Shown on its
 * own, not added to personal totals or category budgets, so nothing is
 * counted twice (decided 2026-11-16).
 */
export function GroupShareCard({ month, className = "" }: { month: string; className?: string }) {
  const { data } = useApiData<MyGroupMonth>(`/reports/groups?month=${month}`);
  if (!data || data.groups.length === 0) return null;
  return (
    <Card
      title="Your share in groups"
      className={className}
      aside={
        <Link href="/groups" className="text-sm font-semibold text-accent hover:underline">
          Groups
        </Link>
      }
    >
      <p className="font-mono text-2xl font-bold tabular-nums">{formatTaka(data.myShare)}</p>
      <p className="mb-2 text-sm text-text-muted">
        Your part of shared expenses in {monthLabel(month)} (you paid {formatTaka(data.paid)}). Not included in your
        personal spending above.
      </p>
      <ul className="divide-y divide-border">
        {data.groups.map((g) => (
          <li key={g.groupId}>
            <Link
              href={`/groups/${g.groupId}`}
              className="flex min-h-12 items-center gap-3 rounded-lg px-1 py-2 hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-accent"
            >
              <UsersRound aria-hidden size={18} className="shrink-0 text-text-muted" />
              <span className="min-w-0 flex-1 truncate font-medium">{g.name}</span>
              <span className="font-mono font-semibold tabular-nums">{formatTaka(g.myShare)}</span>
              <ChevronRight aria-hidden size={16} className="shrink-0 text-text-muted" />
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
