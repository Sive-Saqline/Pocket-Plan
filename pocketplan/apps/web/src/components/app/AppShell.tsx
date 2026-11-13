"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { useRecurring } from "@/lib/use-recurring";

const tabs = [
  { href: "/", label: "Home", icon: "⌂" },
  { href: "/expenses", label: "Expenses", icon: "≡" },
  { href: "/budgets", label: "Budgets", icon: "◔" },
  { href: "/groups/demo", label: "Groups", icon: "👥" },
  { href: "/more", label: "More", icon: "•••" },
];

// Pages reached from More keep the More tab highlighted.
const moreRoutes = ["/more", "/recurring", "/profile"];

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
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col">
      <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-border bg-surface/95 px-4 backdrop-blur">
        <h1 className="flex-1 truncate text-lg font-semibold">{title}</h1>
        {actions}
        <Link
          href="/profile"
          aria-label={`Profile for ${name}`}
          aria-current={pathname === "/profile" ? "page" : undefined}
          className="grid size-11 place-items-center rounded-full hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-accent"
        >
          <span
            aria-hidden
            className={`grid size-9 place-items-center rounded-full bg-accent text-sm font-semibold text-text-inverse ${
              pathname === "/profile" ? "ring-2 ring-accent ring-offset-2 ring-offset-surface" : ""
            }`}
          >
            {name.charAt(0).toUpperCase()}
          </span>
        </Link>
      </header>

      <main className="flex flex-1 flex-col gap-4 px-4 pt-4 pb-36">{children}</main>

      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
      >
        <ul className="mx-auto grid h-16 max-w-2xl grid-cols-5">
          {tabs.map((t) => {
            const active =
              t.href === "/more"
                ? moreRoutes.some((r) => pathname.startsWith(r))
                : t.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(t.href);
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
                  <span aria-hidden className="relative text-lg leading-none">
                    {t.icon}
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

export function Fab({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="fixed right-4 bottom-20 z-20 grid size-14 place-items-center rounded-full bg-accent text-3xl text-text-inverse shadow-lg hover:bg-accent-hover active:bg-accent-pressed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent lg:right-[calc(50%-26rem)]"
    >
      +
    </button>
  );
}
