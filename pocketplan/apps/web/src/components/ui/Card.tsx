import type { ReactNode } from "react";

export function Card({
  title,
  aside,
  children,
  className = "",
}: {
  title?: string;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-xl bg-surface p-4 shadow-card ${className}`}>
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

export function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="flex items-center gap-3 rounded-lg border border-danger/40 bg-danger/10 px-4 py-3">
      <p className="flex-1 text-sm">
        <span className="font-medium">{message}</span>{" "}
        <span className="text-text-muted">Is the API running?</span>
      </p>
      <button type="button" onClick={onRetry} className="h-9 shrink-0 rounded-lg bg-surface px-3 text-sm font-semibold text-accent shadow-card">
        Retry
      </button>
    </div>
  );
}

export function SkeletonRows({ rows = 4 }: { rows?: number }) {
  return (
    <div aria-busy="true" aria-label="Loading" className="flex flex-col">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex animate-pulse items-center gap-3 py-3">
          <div className="size-10 rounded-full bg-surface-muted" />
          <div className="h-4 flex-1 rounded bg-surface-muted" />
          <div className="h-5 w-16 rounded bg-surface-muted" />
        </div>
      ))}
    </div>
  );
}
