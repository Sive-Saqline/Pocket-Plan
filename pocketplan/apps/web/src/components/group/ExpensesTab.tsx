"use client";

import { useState } from "react";
import type { BalancePreview } from "@/lib/api";
import type { Group } from "@/lib/group";
import { formatTaka } from "@/lib/money";
import { ChevronRight, ReceiptText } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";

export function ExpensesTab({
  group,
  preview,
  onAdd,
  onDelete,
}: {
  group: Group;
  preview: BalancePreview | null;
  onAdd: () => void;
  onDelete: (id: string) => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const nameOf = (id: string) => group.members.find((m) => m.id === id)?.name ?? "Unknown";
  const total = group.expenses.reduce((sum, e) => sum + e.amount, 0);

  if (group.expenses.length === 0) {
    return (
      <Card>
        <EmptyState icon={ReceiptText} title="No shared expenses yet." text="Add the first one and PocketPlan will split it.">
          <AddButton onClick={onAdd} />
        </EmptyState>
      </Card>
    );
  }

  return (
    <Card
      title={`${group.expenses.length} expenses`}
      aside={<span className="font-mono font-semibold tabular-nums">{formatTaka(total)}</span>}
    >
      <ul className="divide-y divide-border">
        {[...group.expenses].reverse().map((e) => {
          const index = group.expenses.indexOf(e);
          const shares = preview?.expenses[index]?.shares;
          const open = openId === e.id;
          const splitLabel =
            e.participants.length === 1
              ? e.participants[0] === e.paidBy
                ? "Just the payer"
                : `For ${nameOf(e.participants[0])}`
              : e.participants.length === group.members.length
                ? `Split ${e.participants.length}`
                : `Split ${e.participants.length} of ${group.members.length}`;
          return (
            <li key={e.id}>
              <button
                type="button"
                onClick={() => setOpenId(open ? null : e.id)}
                aria-expanded={open}
                className="flex min-h-16 w-full items-center gap-3 py-2 text-left"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{e.description}</p>
                  <p className="text-sm text-text-muted">
                    {nameOf(e.paidBy)} paid · {splitLabel}
                  </p>
                </div>
                <span className="font-mono text-lg font-semibold tabular-nums">
                  {formatTaka(e.amount)}
                </span>
                <ChevronRight aria-hidden size={20} className={`shrink-0 text-text-muted transition-transform ${open ? "rotate-90" : ""}`} />
              </button>
              {open && (
                <div className="mb-3 rounded-lg bg-surface-muted p-3">
                  <p className="mb-1 text-xs font-medium tracking-wide text-text-muted uppercase">
                    Shares
                  </p>
                  {shares ? (
                    <ul className="text-sm">
                      {shares.map((s) => (
                        <li key={s.memberId} className="flex justify-between py-0.5">
                          <span>{nameOf(s.memberId)}</span>
                          <span className="font-mono tabular-nums">{formatTaka(s.share)}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-text-muted">Calculating…</p>
                  )}
                  <button
                    type="button"
                    onClick={() => onDelete(e.id)}
                    className="mt-2 h-9 rounded-lg px-3 text-sm font-medium text-danger hover:bg-surface"
                  >
                    Delete expense
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

export function AddButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-2 h-11 rounded-lg bg-accent px-4 font-semibold text-text-inverse hover:bg-accent-hover active:bg-accent-pressed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      Add expense
    </button>
  );
}
