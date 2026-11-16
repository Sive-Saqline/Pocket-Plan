"use client";

import { CATEGORY_ICON_OPTIONS } from "./icons";

/** Radio grid of the icons a category can use (CATEGORY_ICON_OPTIONS). */
export function CategoryIconGrid({
  value,
  onChange,
  compact = false,
}: {
  value: string;
  onChange: (key: string) => void;
  /** Smaller tiles, for use inside another form. */
  compact?: boolean;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Icon"
      className={`grid gap-2 ${compact ? "grid-cols-6 sm:grid-cols-8" : "grid-cols-6 sm:grid-cols-8"}`}
    >
      {CATEGORY_ICON_OPTIONS.map((o) => {
        const on = o.key === value;
        return (
          <button
            key={o.key}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={o.label}
            title={o.label}
            onClick={() => onChange(o.key)}
            className={`grid min-h-11 place-items-center rounded-lg border ${compact ? "" : "aspect-square"} ${
              on
                ? "border-accent bg-accent/10 text-accent ring-1 ring-accent"
                : "border-border bg-surface text-text-muted hover:bg-surface-muted hover:text-text"
            }`}
          >
            <o.icon aria-hidden size={compact ? 18 : 20} strokeWidth={1.75} />
          </button>
        );
      })}
    </div>
  );
}
