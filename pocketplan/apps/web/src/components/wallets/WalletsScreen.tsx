"use client";

import { ChevronRight, Plus, Tags, Wallet as WalletGlyph } from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/Button";
import { Card, ErrorBanner, SkeletonRows } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { CategoryBadge, WalletIcon } from "@/components/ui/icons";
import { Toast, useToast } from "@/components/ui/Toast";
import { walletTypes, type Category, type Wallet } from "@/lib/ledger";
import { formatTaka } from "@/lib/money";
import { usePersonalData } from "@/lib/use-personal-data";
import { CategorySheet, usageText } from "./CategorySheet";
import { WalletSheet } from "./WalletSheet";

const typeLabel = (type: Wallet["type"]) => walletTypes.find((t) => t.value === type)?.label ?? "Wallet";
const sum = (values: number[]) => values.reduce((t, v) => t + Math.round(v * 100), 0) / 100;

/** More → Wallets & categories (roadmap Step 12, PRD §6.3-6.4). */
export function WalletsScreen() {
  const personal = usePersonalData();
  const toast = useToast();
  const [walletSheet, setWalletSheet] = useState<{ open: boolean; wallet: Wallet | null }>({ open: false, wallet: null });
  const [categorySheet, setCategorySheet] = useState<{ open: boolean; category: Category | null }>({
    open: false,
    category: null,
  });

  const saved = (message: string) => {
    setWalletSheet({ open: false, wallet: null });
    setCategorySheet({ open: false, category: null });
    personal.reload();
    toast.show(message);
  };

  const total = sum(personal.wallets.map((w) => w.balance));

  return (
    <AppShell title="Wallets & categories">
      {personal.error && <ErrorBanner message={personal.error} onRetry={personal.reload} />}

      <div className="grid gap-4 lg:grid-cols-2 lg:items-start lg:gap-6">
        <Card
          title="Wallets"
          aside={
            <Button size="sm" variant="secondary" onClick={() => setWalletSheet({ open: true, wallet: null })}>
              <Plus aria-hidden size={16} />
              Add
            </Button>
          }
        >
          <p className="mb-2 text-sm text-text-muted">Where your money is kept. Every expense is paid from one.</p>
          {!personal.ready ? (
            <SkeletonRows rows={3} />
          ) : personal.wallets.length === 0 ? (
            <EmptyState icon={WalletGlyph} title="No wallets yet." text="Add one, e.g. Cash or bKash." />
          ) : (
            <>
              <ul className="divide-y divide-border">
                {personal.wallets.map((w) => (
                  <li key={w.id}>
                    <button
                      type="button"
                      onClick={() => setWalletSheet({ open: true, wallet: w })}
                      className="flex min-h-16 w-full items-center gap-3 rounded-lg px-1 py-2 text-left hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-accent"
                    >
                      <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full bg-accent/10 text-accent">
                        <WalletIcon type={w.type} size={20} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{w.name}</span>
                        <span className="block text-sm text-text-muted">{typeLabel(w.type)}</span>
                      </span>
                      <span className={`font-mono font-semibold tabular-nums ${w.balance < 0 ? "text-danger" : ""}`}>
                        {formatTaka(w.balance, { signed: w.balance < 0 })}
                      </span>
                      <ChevronRight aria-hidden size={18} className="shrink-0 text-text-muted" />
                    </button>
                  </li>
                ))}
              </ul>
              <p className="mt-2 flex justify-between border-t border-border px-1 pt-3 text-sm">
                <span className="text-text-muted">Total balance</span>
                <span className={`font-mono font-semibold tabular-nums ${total < 0 ? "text-danger" : ""}`}>
                  {formatTaka(total, { signed: total < 0 })}
                </span>
              </p>
            </>
          )}
        </Card>

        <Card
          title="Categories"
          aside={
            <Button size="sm" variant="secondary" onClick={() => setCategorySheet({ open: true, category: null })}>
              <Plus aria-hidden size={16} />
              Add
            </Button>
          }
        >
          <p className="mb-2 text-sm text-text-muted">How your spending is grouped in budgets and reports.</p>
          {!personal.ready ? (
            <SkeletonRows rows={5} />
          ) : personal.categories.length === 0 ? (
            <EmptyState icon={Tags} title="No categories yet." text="Add one, e.g. Food or Rent." />
          ) : (
            <ul className="divide-y divide-border">
              {personal.categories.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => setCategorySheet({ open: true, category: c })}
                    className="flex min-h-14 w-full items-center gap-3 rounded-lg px-1 py-2 text-left hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-accent"
                  >
                    <CategoryBadge icon={c.icon} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{c.name}</span>
                      <span className="block truncate text-sm text-text-muted">
                        {(c.expenseCount ?? 0) + (c.recurringCount ?? 0) > 0
                          ? `Used in ${usageText(c.expenseCount ?? 0, c.recurringCount ?? 0)}`
                          : "Not used yet"}
                        {c.systemKey === "savings" && " · Counts as savings"}
                      </span>
                    </span>
                    <ChevronRight aria-hidden size={18} className="shrink-0 text-text-muted" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <WalletSheet
        open={walletSheet.open}
        wallet={walletSheet.wallet}
        onClose={() => setWalletSheet({ open: false, wallet: null })}
        onSaved={saved}
      />
      <CategorySheet
        open={categorySheet.open}
        category={categorySheet.category}
        categories={personal.categories}
        onClose={() => setCategorySheet({ open: false, category: null })}
        onSaved={saved}
      />
      <Toast message={toast.message} />
    </AppShell>
  );
}
