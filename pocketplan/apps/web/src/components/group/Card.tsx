import type { ReactNode } from "react";

export function Card({
  title,
  aside,
  children,
}: {
  title?: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl bg-surface p-4 shadow-card">
      {title && (
        <header className="mb-2 flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold">{title}</h2>
          {aside}
        </header>
      )}
      {children}
    </section>
  );
}
