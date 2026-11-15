"use client";

import { ChevronRight, Repeat, UserRound, WalletCards, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { AppShell } from "@/components/app/AppShell";
import { useAuth } from "@/lib/auth";
import { useRecurring } from "@/lib/use-recurring";

export function MoreScreen() {
  const { state } = useAuth();
  const { due, data } = useRecurring();

  return (
    <AppShell title="More">
      <ul className="flex flex-col overflow-hidden rounded-xl bg-surface shadow-card">
        <MoreLink
          href="/recurring"
          icon={Repeat}
          title="Recurring expenses"
          detail={
            data === null
              ? "Bills and subscriptions"
              : data.length === 0
                ? "Set up bills and subscriptions"
                : `${data.filter((r) => r.isActive).length} active`
          }
          badge={
            due.length > 0 && (
              <span className="rounded-full bg-danger px-2 py-0.5 text-xs font-semibold text-white">
                {due.length} due
              </span>
            )
          }
        />
        <MoreLink
          href="/wallets"
          icon={WalletCards}
          title="Wallets & categories"
          detail="Add, rename or remove; set wallet balances"
        />
        <MoreLink href="/profile" icon={UserRound} title="Profile & settings" detail={state.user?.email ?? ""} />
      </ul>
    </AppShell>
  );
}

function MoreLink({
  href,
  icon: Icon,
  title,
  detail,
  badge,
}: {
  href: string;
  icon: LucideIcon;
  title: string;
  detail: string;
  badge?: ReactNode;
}) {
  return (
    <li className="border-b border-border last:border-0">
      <Link href={href} className="flex min-h-16 items-center gap-3 px-4 py-3 hover:bg-surface-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent">
        <span aria-hidden className="grid size-10 place-items-center rounded-full bg-accent/10 text-accent">
          <Icon size={20} strokeWidth={1.75} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-medium">{title}</span>
          <span className="block truncate text-sm text-text-muted">{detail}</span>
        </span>
        {badge}
        <ChevronRight aria-hidden size={20} className="text-text-muted" />
      </Link>
    </li>
  );
}
