"use client";

import { useState } from "react";
import { monthLabel } from "@/lib/dates";
import { formatTaka } from "@/lib/money";
import { compactTaka, type TrendBy, type TrendPoint } from "@/lib/reports";

/** Smallest "round" number ≥ value (1, 2, 2.5, 5 × 10ⁿ) for the axis top. */
function niceMax(value: number) {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  for (const step of [1, 2, 2.5, 5, 10]) {
    if (step * magnitude >= value) return step * magnitude;
  }
  return 10 * magnitude;
}

const dateOf = (key: string) => {
  const [y, m, d = 1] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
};

/** Full label: "November 2026" or "Thu 5 Nov". */
const longLabel = (key: string, by: TrendBy) =>
  by === "month"
    ? monthLabel(key)
    : dateOf(key).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });

/** Axis label: "Nov", or "5" for a day ("1 Dec" on the first column and on a 1st). */
const axisLabel = (key: string, by: TrendBy, first: boolean) =>
  by === "month"
    ? dateOf(key).toLocaleDateString("en-GB", { month: "short" })
    : first || key.endsWith("-01")
      ? dateOf(key).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
      : String(dateOf(key).getDate());

/**
 * Spending per month (or per day, for short custom ranges) as columns: one
 * series, so one colour and no legend. Each column is a button: hover, tap
 * or focus shows its exact amount. "Table" shows the same numbers as text.
 */
export function TrendChart({ points, by = "month" }: { points: TrendPoint[]; by?: TrendBy }) {
  const [view, setView] = useState<"chart" | "table">("chart");
  const [active, setActive] = useState<number | null>(null);
  const top = niceMax(Math.max(...points.map((p) => p.total)));
  const ticks = [top, top / 2, 0];
  const highest = points.reduce((best, p) => (p.total > best.total ? p : best), points[0]);
  // Label every nth column so labels never crowd (fewer on phones).
  const stepWide = Math.max(1, Math.ceil(points.length / 16));
  const stepPhone = Math.max(1, Math.ceil(points.length / 7));
  const gap = points.length > 31 ? "gap-px" : "gap-0.5 sm:gap-1";

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
              <th scope="col" className="py-2 font-medium">{by === "month" ? "Month" : "Day"}</th>
              <th scope="col" className="py-2 text-right font-medium">Expenses</th>
              <th scope="col" className="py-2 text-right font-medium">Spent</th>
            </tr>
          </thead>
          <tbody>
            {points.map((p) => (
              <tr key={p.key} className="border-t border-border">
                <th scope="row" className="py-2 text-left font-normal">{longLabel(p.key, by)}</th>
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
              <ul className={`absolute inset-0 flex items-end ${gap}`}>
                {points.map((p, i) => {
                  const height = (p.total / top) * 100;
                  const isActive = active === i;
                  const align =
                    i < points.length / 4
                      ? "left-0"
                      : i >= (points.length * 3) / 4
                        ? "right-0"
                        : "left-1/2 -translate-x-1/2";
                  return (
                    <li key={p.key} className="relative flex h-full flex-1 justify-center">
                      <button
                        type="button"
                        aria-label={`${longLabel(p.key, by)}: ${formatTaka(p.total)}, ${p.count} ${p.count === 1 ? "expense" : "expenses"}`}
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
                          <p className="font-medium">{longLabel(p.key, by)}</p>
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

            {/* x-axis labels: only every nth column, centred under it */}
            <span />
            <ol aria-hidden className={`mt-1.5 flex h-4 text-xs text-text-muted ${gap}`}>
              {points.map((p, i) => (
                <li key={p.key} className="relative flex-1">
                  <span
                    className={`absolute left-1/2 -translate-x-1/2 whitespace-nowrap ${
                      i % stepPhone === 0 ? "inline" : "hidden"
                    } ${i % stepWide === 0 ? "sm:inline" : "sm:hidden"}`}
                  >
                    {axisLabel(p.key, by, i === 0)}
                  </span>
                </li>
              ))}
            </ol>
          </div>
          <figcaption className="mt-2 text-sm text-text-muted">
            {highest.total > 0
              ? `Highest: ${longLabel(highest.key, by)}, ${formatTaka(highest.total)}.`
              : `No spending on these ${by === "month" ? "months" : "days"}.`}
          </figcaption>
        </figure>
      )}
    </div>
  );
}
