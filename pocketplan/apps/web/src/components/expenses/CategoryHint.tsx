"use client";

import { Sparkles } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { CATEGORY_ICON_OPTIONS } from "@/components/ui/icons";
import type { CategoryGuess } from "@/lib/ai";
import { useAuth } from "@/lib/auth";

/**
 * Auto-categorize (PRD §6.15): asks once per description, when the user
 * leaves the description field. A hint only: it fails quietly (the picker is
 * right there) and is applied only when the user taps it.
 */
export function useCategoryGuess(groupId?: string) {
  const { request } = useAuth();
  const [guess, setGuess] = useState<CategoryGuess | null>(null);
  const asked = useRef("");

  const suggest = useCallback(
    async (description: string) => {
      const text = description.trim();
      if (text.length < 3 || text === asked.current) return;
      asked.current = text;
      try {
        if (groupId) {
          const r = await request<{ category: string | null }>("/ai/categorize", {
            method: "POST",
            body: { description: text, groupId },
          });
          const option = CATEGORY_ICON_OPTIONS.find((o) => o.key === r.category);
          setGuess(option ? { value: option.key, label: option.label } : null);
        } else {
          const r = await request<{ categoryId: string | null; name: string | null }>("/ai/categorize", {
            method: "POST",
            body: { description: text },
          });
          setGuess(r.categoryId && r.name ? { value: r.categoryId, label: r.name } : null);
        }
      } catch {
        setGuess(null);
      }
    },
    [request, groupId],
  );

  const reset = useCallback(() => {
    asked.current = "";
    setGuess(null);
  }, []);

  return { guess, suggest, reset };
}

export function CategoryHint({ guess, onUse }: { guess: CategoryGuess; onUse: () => void }) {
  return (
    <button
      type="button"
      onClick={onUse}
      className="mt-2 inline-flex min-h-11 items-center gap-1.5 rounded-full border border-accent/40 bg-accent/10 px-3 text-sm font-medium text-text hover:bg-accent/15 focus-visible:outline-2 focus-visible:outline-accent"
    >
      <Sparkles aria-hidden size={14} className="text-accent" />
      Suggested: {guess.label}
      <span className="text-accent">· Use</span>
    </button>
  );
}
