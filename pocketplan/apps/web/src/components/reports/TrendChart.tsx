"use client";

import { useState } from "react";
import { monthLabel } from "@/lib/dates";
import { formatTaka } from "@/lib/money";
import { compactTaka, type TrendPoint } from "@/lib/reports";

/** Smallest "round" number ≥ value (1, 2, 2.5, 5 × 10ⁿ) for the axis top. */
function niceMax(value: number) {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  for (const step of [1, 2, 2.5, 5, 10]) {
    if (step * magnitude >= value) return step * magnitude;
  }
  return 10 * magnitude;
}

const shortMonth = (month: string) => {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-GB", { month: "short" });
};

/**
 * Spending per month as columns (one series, so one colour and no legend).
 * Each column is a button: hover, tap or focus shows its exact amount.
 * "Table" shows the same numbers as text.
 */
export function TrendChart({ points }: { points: TrendPoint[] }) {
  const [view, setView] = useState<"chart" | "table">("chart");
  const [active, setActive] = useState<number | null>(null);
  const top = niceMax(Math.max(...points.map((p) => p.total)));
  const ticks = [top, top / 2, 0];
  const highest = points.reduce((best, p) => (p.total > best.total ? p : best), points[0]);

  return (
    <div>
      <div role="group" aria-label="Show trend as" className="mb-3 inline-flex rounded-lg bg-surface-muted p-0.5 text-sm">
        {(["chart", "table"] as const).map((v) => (
          <button
            key={v}
            type="button"
            aria-pressed={view === v}
            onClick={() => setView(v)}
            className={`h-9 rounded-md px-3 font-medium capitalize focus-visible:outline-2 focus-visible:outline-accent ${
              view === v ? "bg-surface text-text shadow-card" : "text-text-muted hover:text-text"
            }`}
          >
            {v}
          </button>
        ))}
      </div>

      {view === "table" ? (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-text-muted">
              <th scope="col" className="py-2 font-medium">Month</th>
              <th scope="col" className="py-2 text-right font-medium">Expenses</th>
              <th scope="col" className="py-2 text-right font-medium">Spent</th>
            </tr>
          </thead>
          <tbody>
            {points.map((p) => (
              <tr key={p.month} className="border-t border-border">
                <th scope="row" className="py-2 text-left font-normal">{monthLabel(p.month)}</th>
                <td className="py-2 text-right font-mono tabular-nums text-text-muted">{p.count}</td>
                <td className="py-2 text-right font-mono font-semibold tabular-nums">{formatTaka(p.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <figure>
          <div className="grid grid-cols-[auto_1fr] gap-x-2">
            {/* y-axis labels, aligned with the grid lines */}
            <div aria-hidden className="relative h-44 w-11 font-mono text-xs text-text-muted tabular-nums">
              {ticks.map((t, i) => (
                <span key={t} className="absolute right-0 -translate-y-1/2" style={{ top: `${i * 50}%` }}>
                  {compactTaka(t)}
                </span>
              ))}
            </div>

            <div className="relative h-44" onPointerLeave={() => setActive(null)}>
              {ticks.map((t, i) => (
                <span
                  key={t}
                  aria-hidden
                  className={`absolute inset-x-0 border-t ${i === 2 ? "border-text-muted/50" : "border-dashed border-border"}`}
                  style={{ top: `${i * 50}%` }}
                />
              ))}
              <ul className="absolute inset-0 flex items-end gap-0.5 sm:gap-1">
                {points.map((p, i) => {
                  const height = (p.total / top) * 100;
                  const isActive = active === i;
                  const align = i === 0 ? "left-0" : i === points.length - 1 ? "right-0" : "left-1/2 -translate-x-1/2";
                  return (
                    <li key={p.month} className="relative flex h-full flex-1 justify-center">
                      <button
                        type="button"
                        aria-label={`${monthLabel(p.month)}: ${formatTaka(p.total)}, ${p.count} ${p.count === 1 ? "expense" : "expenses"}`}
                        onPointerEnter={() => setActive(i)}
                        onFocus={() => setActive(i)}
                        onBlur={() => setActive(null)}
                        onClick={() => setActive(isActive ? null : i)}
                        className="flex h-full w-full items-end justify-center rounded-md focus-visible:outline-2 focus-visible:outline-accent"
                      >
                        <span
                          className={`block w-full max-w-10 rounded-t ${isActive ? "bg-accent-hover" : "bg-accent"}`}
                          style={{ height: `${height}%`, minHeight: p.total > 0 ? 2 : 0 }}
                        />
                      </button>
                      {isActive && (
                        <div
                          role="status"
                          className={`pointer-events-none absolute z-10 w-max rounded-lg bg-surface-elevated px-3 py-2 text-sm shadow-lg ring-1 ring-border ${align}`}
                          style={{ bottom: `calc(${Math.min(height, 100)}% + 8px)` }}
                        >
                          <p className="font-medium">{monthLabel(p.month)}</p>
                          <p className="font-mono font-semibold tabular-nums">{formatTaka(p.total)}</p>
                          <p className="text-xs text-text-muted">
                            {p.count} {p.count === 1 ? "expense" : "expenses"}
                          </p>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* x-axis labels */}
            <span />
            <ol aria-hidden className="mt-1.5 flex gap-0.5 text-center text-xs text-text-muted sm:gap-1">
              {points.map((p, i) => (
                <li key={p.month} className="flex-1 truncate">
                  {/* 12 columns are tight on phones: label every other one there */}
                  <span className={points.length > 6 && i % 2 === 1 ? "hidden sm:inline" : ""}>{shortMonth(p.month)}</span>
                </li>
              ))}
            </ol>
          </div>
          <figcaption className="mt-2 text-sm text-text-muted">
            {highest.total > 0
              ? `Highest: ${monthLabel(highest.month)}, ${formatTaka(highest.total)}.`
              : "No spending in these months."}
          </figcaption>
        </figure>
      )}
    </div>
  );
}
