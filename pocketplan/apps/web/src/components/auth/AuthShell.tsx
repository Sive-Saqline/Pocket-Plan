import type { ReactNode } from "react";
import { Logo } from "@/components/brand/Logo";

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
          <Logo variant="mark" className="mb-3 size-14 drop-shadow-sm" />
          <p className="text-lg font-semibold tracking-tight">
            Pocket<span className="text-accent">Plan</span>
          </p>
          <h1 className="mt-3 text-2xl font-semibold">{title}</h1>
          <p className="mt-1 text-text-muted">{subtitle}</p>
        </div>
        <div className="rounded-xl bg-surface p-5 shadow-card sm:p-6">{children}</div>
        <p className="mt-5 text-center text-sm text-text-muted">{footer}</p>
      </div>
    </main>
  );
}
