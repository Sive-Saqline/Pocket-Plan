"use client";

import { Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { isoDate } from "@/lib/dates";
import { viewKey, type Insights, type ReportView } from "@/lib/reports";

export interface CachedInsight {
  insights: Insights;
  /** Set when the view came from an Ask AI question. */
  question?: string;
  answer?: string;
}

/**
 * Insights already written in this visit, per view. Asking again for the
 * same view reuses them, which saves the AI quota. Cleared on reload.
 */
const cache = new Map<string, CachedInsight>();

export function rememberInsight(view: ReportView, entry: CachedInsight) {
  cache.set(viewKey(view), entry);
}

/** Insights already written for this view, if any (e.g. for a download). */
export function cachedInsight(view: ReportView): CachedInsight | null {
  return cache.get(viewKey(view)) ?? null;
}

/**
 * AI insights for the report on screen (PRD §6.16, merged into Reports).
 * Written only when the user asks; the report above never depends on it.
 */
export function InsightsCard({
  view,
  empty,
  answered = 0,
}: {
  view: ReportView;
  empty: boolean;
  /** Bumped after Ask AI answers, which may leave the view unchanged. */
  answered?: number;
}) {
  const { request } = useAuth();
  const key = viewKey(view);
  const [entry, setEntry] = useState<CachedInsight | null>(() => cache.get(key) ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A different view (or an answer from Ask AI for this one) shows its own insight.
  useEffect(() => {
    setEntry(cache.get(key) ?? null);
    setError(null);
  }, [key, answered]);

  async function generate(fresh = false) {
    if (!fresh && cache.has(key)) return setEntry(cache.get(key)!);
    setLoading(true);
    setError(null);
    try {
      const insights = await request<Insights>("/ai/insights", {
        method: "POST",
        body: {
          start: view.start,
          end: view.end,
          ...(view.groupId && { groupId: view.groupId }),
          categories: view.categories,
          wallets: view.wallets,
          today: isoDate(),
        },
      });
      const next = { insights };
      cache.set(key, next);
      setEntry(next);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't reach the AI. The report above is unaffected.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="flex flex-col">
      <h2 className="mb-2 flex items-center gap-1.5 text-base font-semibold">
        <Sparkles aria-hidden size={16} className="text-accent" />
        AI insights
      </h2>
      <div aria-live="polite" className="flex flex-1 flex-col gap-3">

        {loading ? (
          <div className="flex flex-col gap-2" aria-busy>
            <span className="sr-only">Writing insights…</span>
            {[90, 75, 60].map((w) => (
              <span key={w} className="h-3.5 animate-pulse rounded bg-surface-muted" style={{ width: `${w}%` }} />
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-start gap-2">
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
            <Button variant="secondary" size="sm" onClick={() => generate(true)}>
              Try again
            </Button>
          </div>
        ) : entry ? (
          <>
            {entry.answer && (
              <div className="rounded-lg bg-accent/10 px-3 py-2">
                {entry.question && <p className="text-xs text-text-muted">&ldquo;{entry.question}&rdquo;</p>}
                <p className="font-medium">{entry.answer}</p>
              </div>
            )}
            <ul className="flex flex-col gap-2 text-sm">
              {[entry.insights.summary, entry.insights.notable, entry.insights.forecast]
                .filter(Boolean)
                .map((line) => (
                  <li key={line} className="flex gap-2">
                    <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />
                    <span>{line}</span>
                  </li>
                ))}
            </ul>
            <div className="mt-auto flex items-center justify-between gap-2 border-t border-border pt-2">
              <p className="text-xs text-text-muted">Written by AI from the numbers above. Information, not advice.</p>
              <Button variant="ghost" size="sm" onClick={() => generate(true)}>
                Refresh
              </Button>
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-start justify-between gap-3">
            <p className="text-sm text-text-muted">
              {empty
                ? "There's no spending in view to explain yet."
                : "A short summary of this report in plain words: where the money went, what stands out, and what next month may look like."}
            </p>
            <Button variant="secondary" size="sm" onClick={() => generate()} disabled={empty}>
              <Sparkles aria-hidden size={15} />
              Get insights
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
