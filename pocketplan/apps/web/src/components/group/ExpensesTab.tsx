"use client";

import { ChevronRight, ReceiptText } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, SkeletonRows } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { CategoryBadge } from "@/components/ui/icons";
import { useAuth } from "@/lib/auth";
import { dayLabel } from "@/lib/dates";
import { splitTypes, type GroupDetail, type GroupExpense } from "@/lib/group";
import { formatTaka } from "@/lib/money";

/** The month's shared expenses, newest first. */
export function ExpensesTab({
  group,
  expenses,
  onOpen,
  onAdd,
}: {
  group: GroupDetail;
  expenses: GroupExpense[] | null;
  onOpen: (e: GroupExpense) => void;
  onAdd: () => void;
}) {
  if (!expenses) {
    return (
      <Card>
        <SkeletonRows rows={5} />
      </Card>
    );
  }
  if (expenses.length === 0) {
    return (
      <Card>
        <EmptyState icon={ReceiptText} title="No shared expenses this month." text="Add one and choose how to split it.">
          <Button onClick={onAdd}>Add shared expense</Button>
        </EmptyState>
      </Card>
    );
  }
  return (
    <Card>
      <ul className="divide-y divide-border">
        {expenses.map((e) => (
          <GroupExpenseRow key={e.id} expense={e} group={group} onOpen={onOpen} />
        ))}
      </ul>
    </Card>
  );
}

/** One shared expense: what, who paid, how it was split, and my part of it. */
export function GroupExpenseRow({
  expense: e,
  group,
  onOpen,
}: {
  expense: GroupExpense;
  group: GroupDetail;
  onOpen: (e: GroupExpense) => void;
}) {
  const me = useAuth().state.user?.id;
  const nameOf = (id: string) => (id === me ? "You" : (group.members.find((m) => m.userId === id)?.name ?? "Former member"));
  const mine = e.participants.find((p) => p.userId === me)?.amount ?? 0;
  const split =
    e.participants.length === 1
      ? `just ${nameOf(e.participants[0].userId) === "You" ? "you" : nameOf(e.participants[0].userId)}`
      : `${splitTypes.find((s) => s.value === e.splitType)?.label.toLowerCase()} between ${e.participants.length}`;

  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(e)}
        className="flex min-h-16 w-full items-center gap-3 rounded-lg px-1 py-2 text-left hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-accent"
      >
        <CategoryBadge icon={e.category} />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{e.description}</span>
          <span className="block truncate text-sm text-text-muted">
            {dayLabel(e.expenseDate)} · {nameOf(e.paidBy)} paid · {split}
          </span>
        </span>
        <span className="text-right">
          <span className="block font-mono font-semibold tabular-nums">{formatTaka(e.amount)}</span>
          <span className="block text-xs text-text-muted">{mine > 0 ? `your share ${formatTaka(mine)}` : "not in it"}</span>
        </span>
        <ChevronRight aria-hidden size={18} className="shrink-0 text-text-muted" />
      </button>
    </li>
  );
}
