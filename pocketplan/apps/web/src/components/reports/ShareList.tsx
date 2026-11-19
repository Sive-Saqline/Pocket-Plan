import type { ReactNode } from "react";
import { formatTaka } from "@/lib/money";

export interface ShareItem {
  id: string;
  name: string;
  icon: ReactNode;
  total: number;
  /** percent of the period's total */
  share: number;
}

/**
 * Ranked horizontal bars: name, percent and amount are printed on every row,
 * so the bar only adds the shape (one colour; no legend needed).
 */
export function ShareList({ items }: { items: ShareItem[] }) {
  return (
    <ul className="flex flex-col gap-1">
      {items.map((item) => (
        <li key={item.id} className="px-1 py-2">
          <span className="flex items-center gap-2">
            <span aria-hidden className="shrink-0 text-text-muted">
              {item.icon}
            </span>
            <span className="min-w-0 flex-1 truncate font-medium">{item.name}</span>
            <span className="text-sm text-text-muted tabular-nums">{item.share}%</span>
            <span className="w-24 text-right font-mono font-semibold tabular-nums">{formatTaka(item.total)}</span>
          </span>
          <span aria-hidden className="mt-1.5 block h-2 overflow-hidden rounded-full bg-surface-muted">
            <span className="block h-full rounded-full bg-accent" style={{ width: `${Math.max(item.share, 1)}%` }} />
          </span>
        </li>
      ))}
    </ul>
  );
}
