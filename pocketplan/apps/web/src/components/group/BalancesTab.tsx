import type { BalancePreview, Group } from "@/lib/group";
import { formatTaka } from "@/lib/money";
import { Avatar } from "./Avatar";
import { ArrowRight, Check, CircleCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";

type Payment = BalancePreview["payments"][number];

export function BalancesTab({
  group,
  preview,
  loading,
  onSettle,
  onUndoSettlement,
}: {
  group: Group;
  preview: BalancePreview | null;
  loading: boolean;
  onSettle: (payment: Payment) => void;
  onUndoSettlement: (id: string) => void;
}) {
  const indexOf = (id: string) => group.members.findIndex((m) => m.id === id);
  const nameOf = (id: string) => group.members.find((m) => m.id === id)?.name ?? "Unknown";
  const paidBy = (id: string) =>
    group.expenses.filter((e) => e.paidBy === id).reduce((sum, e) => sum + e.amount, 0);

  if (!preview) return <BalancesSkeleton rows={group.members.length} />;

  return (
    // Desktop: balances | suggested settlements side by side, history underneath.
    <div className={`grid gap-3 transition-opacity lg:grid-cols-2 lg:items-start lg:gap-6 ${loading ? "opacity-60" : ""}`}>
      <Card title="Member balances">
        <ul className="divide-y divide-border">
          {preview.balances.map((b) => (
            <li key={b.memberId} className="flex items-center gap-3 py-3">
              <Avatar name={b.name} index={indexOf(b.memberId)} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{b.name}</p>
                <p className="text-sm text-text-muted">Paid {formatTaka(paidBy(b.memberId))}</p>
              </div>
              <div className="text-right">
                <p
                  className={`font-mono text-lg font-semibold tabular-nums ${
                    b.balance > 0 ? "text-success" : b.balance < 0 ? "text-danger" : "text-text-muted"
                  }`}
                >
                  {formatTaka(b.balance, { signed: true })}
                </p>
                <p className="text-xs text-text-muted">
                  {b.balance > 0 ? "gets back" : b.balance < 0 ? "owes" : "settled"}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <Card
        title="Suggested settlements"
        aside={
          preview.payments.length > 0 && (
            <span className="rounded-full bg-surface-muted px-2.5 py-0.5 text-xs font-medium text-text-muted">
              {preview.payments.length} {preview.payments.length === 1 ? "payment" : "payments"}
            </span>
          )
        }
      >
        {preview.payments.length === 0 ? (
          <EmptyState
            icon={CircleCheck}
            title="Everyone is settled up"
            text="New shared expenses will show up here."
          />
        ) : (
          <>
            <p className="mb-2 text-sm text-text-muted">
              Matches the biggest debts with the biggest credits first, so the group clears up
              in as few payments as possible.
            </p>
            <ul className="flex flex-col gap-2">
              {preview.payments.map((p) => (
                <li
                  key={`${p.from}-${p.to}`}
                  className="flex items-center gap-3 rounded-lg border border-border p-3"
                >
                  <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="font-medium">{p.fromName}</span>
                    <ArrowRight aria-hidden size={16} className="text-text-muted" />
                    <span className="sr-only">pays</span>
                    <span className="font-medium">{p.toName}</span>
                    <span className="w-full font-mono text-lg font-semibold tabular-nums sm:ml-auto sm:w-auto">
                      {formatTaka(p.amount)}
                    </span>
                  </div>
                  <Button onClick={() => onSettle(p)} disabled={loading} className="shrink-0">
                    Settle
                  </Button>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>

      {group.settlements.length > 0 && (
        <Card title="Settlement history" className="lg:col-span-2">
          <ul className="divide-y divide-border">
            {[...group.settlements].reverse().map((s) => (
              <li key={s.id} className="flex items-center gap-3 py-3">
                <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full bg-success/10 text-success">
                  <Check size={20} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="break-words">
                    <span className="font-medium">{nameOf(s.from)}</span> paid{" "}
                    <span className="font-medium">{nameOf(s.to)}</span>
                  </p>
                  <p className="text-sm text-text-muted">
                    <span className="font-mono font-semibold text-text tabular-nums">
                      {formatTaka(s.amount)}
                    </span>{" "}
                    · {new Date(s.settledAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onUndoSettlement(s.id)}
                  className="h-9 rounded-lg px-3 text-sm font-medium text-accent hover:bg-surface-muted"
                >
                  Undo
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function BalancesSkeleton({ rows }: { rows: number }) {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-label="Loading balances">
      <div className="rounded-xl bg-surface p-4 shadow-card">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex animate-pulse items-center gap-3 py-3">
            <div className="size-10 rounded-full bg-surface-muted" />
            <div className="h-4 flex-1 rounded bg-surface-muted" />
            <div className="h-5 w-20 rounded bg-surface-muted" />
          </div>
        ))}
      </div>
      <div className="h-40 animate-pulse rounded-xl bg-surface shadow-card" />
    </div>
  );
}
