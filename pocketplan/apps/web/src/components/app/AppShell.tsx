"use client";

import { Ellipsis, House, PieChart, Plus, ReceiptText, UsersRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Logo } from "@/components/brand/Logo";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { useAuth } from "@/lib/auth";
import { useRecurring } from "@/lib/use-recurring";

const tabs = [
  { href: "/", label: "Home", icon: House },
  { href: "/expenses", label: "Expenses", icon: ReceiptText },
  { href: "/budgets", label: "Budgets", icon: PieChart },
  { href: "/groups/demo", label: "Groups", icon: UsersRound },
  { href: "/more", label: "More", icon: Ellipsis },
];

// Pages reached from More keep the More tab highlighted.
const moreRoutes = ["/more", "/recurring", "/profile"];

function isActive(href: string, pathname: string) {
  if (href === "/more") return moreRoutes.some((r) => pathname.startsWith(r));
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

/**
 * Page frame. Phones and tablets: top bar + bottom tab bar.
 * Desktop (lg, ≥1024px): fixed sidebar navigation and a wide content area.
 */
export function AppShell({
  title,
  actions,
  children,
}: {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const { state } = useAuth();
  const pathname = usePathname();
  const name = state.user?.name ?? "";
  // EXPERIENCE.md §4.12: red dot on More while any recurring expense is due
  const dueCount = useRecurring().due.length;

  return (
    <div className="min-h-dvh lg:pl-64">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border bg-surface lg:flex">
        <Link
          href="/"
          aria-label="PocketPlan home"
          className="flex h-16 shrink-0 items-center px-5 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
        >
          <Logo />
        </Link>
        <nav aria-label="Main" className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="flex flex-col gap-1">
            {tabs.map((t) => {
              const active = isActive(t.href, pathname);
              const badge = t.href === "/more" && dueCount > 0;
              return (
                <li key={t.href}>
                  <Link
                    href={t.href}
                    aria-current={active ? "page" : undefined}
                    className={`flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-accent ${
                      active ? "bg-accent/10 text-accent" : "text-text-muted hover:bg-surface-muted hover:text-text"
                    }`}
                  >
                    <t.icon aria-hidden size={20} strokeWidth={active ? 2.25 : 1.75} />
                    <span className="flex-1">{t.label}</span>
                    {badge && (
                      <span className="rounded-full bg-danger px-2 py-0.5 text-xs font-semibold text-white">
                        {dueCount}
                        <span className="sr-only"> recurring due</span>
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>

      <header className="sticky top-0 z-20 border-b border-border bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center gap-3 px-4 sm:px-6 lg:h-16 lg:px-8">
          <Link
            href="/"
            aria-label="PocketPlan home"
            className="shrink-0 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent lg:hidden"
          >
            <Logo variant="mark" className="size-8" />
          </Link>
          <h1 className="flex-1 truncate text-lg font-semibold lg:text-xl">{title}</h1>
          {actions}
          <Link
            href="/profile"
            aria-label={`Profile for ${name}`}
            aria-current={pathname === "/profile" ? "page" : undefined}
            className="grid size-11 place-items-center rounded-full hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-accent"
          >
            <UserAvatar
              name={name}
              avatarUrl={state.user?.avatarUrl}
              className={`size-9 text-sm ${pathname === "/profile" ? "ring-2 ring-accent ring-offset-2 ring-offset-surface" : ""}`}
            />
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 pt-4 pb-36 sm:px-6 lg:gap-6 lg:px-8 lg:pt-6 lg:pb-16">
        {children}
      </main>

      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        <ul className="mx-auto grid h-16 max-w-2xl grid-cols-5">
          {tabs.map((t) => {
            const active = isActive(t.href, pathname);
            const badge = t.href === "/more" && dueCount > 0;
            return (
              <li key={t.href}>
                <Link
                  href={t.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex h-full flex-col items-center justify-center gap-0.5 text-xs font-medium ${
                    active ? "text-accent" : "text-text-muted hover:text-text"
                  }`}
                >
                  <span aria-hidden className="relative">
                    <t.icon size={22} strokeWidth={active ? 2.25 : 1.75} />
                    {badge && <span className="absolute -top-0.5 -right-2 size-2 rounded-full bg-danger" />}
                  </span>
                  {t.label}
                  {badge && <span className="sr-only">, {dueCount} recurring due</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

/** Floating "+" button: above the tab bar on phones, bottom-right corner on desktop. */
export function Fab({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="fixed right-4 bottom-20 z-20 grid size-14 place-items-center rounded-full bg-accent text-text-inverse shadow-lg hover:bg-accent-hover active:bg-accent-pressed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:right-6 lg:right-8 lg:bottom-8"
    >
      <Plus aria-hidden size={28} />
    </button>
  );
}
