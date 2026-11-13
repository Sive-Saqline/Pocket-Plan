import type { ReactNode } from "react";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <span
            aria-hidden
            className="mb-3 grid size-14 place-items-center rounded-2xl bg-accent text-4xl leading-none text-text-inverse shadow-card"
          >
            ৳
          </span>
          <p className="text-sm font-semibold tracking-wide text-accent">PocketPlan</p>
          <h1 className="mt-1 text-2xl font-semibold">{title}</h1>
          <p className="mt-1 text-text-muted">{subtitle}</p>
        </div>
        <div className="rounded-xl bg-surface p-5 shadow-card sm:p-6">{children}</div>
        <p className="mt-5 text-center text-sm text-text-muted">{footer}</p>
      </div>
    </main>
  );
}
