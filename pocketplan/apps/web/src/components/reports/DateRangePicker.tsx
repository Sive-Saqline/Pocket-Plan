"use client";

import { CalendarDays } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { inputClass } from "@/components/expenses/Pickers";
import { isoDate } from "@/lib/dates";
import { dayCount, MAX_DAYS, type DateRange } from "@/lib/reports";

const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return isoDate(d);
};

/** Quick choices, each ending today. */
const QUICK = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 15 days", days: 15 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
];

/**
 * Calendar button that opens a small panel to pick any start and end date
 * (up to a year, not after today). Uses the browser's own date inputs, so
 * the calendar is native and accessible on phones and desktops.
 */
export function DateRangePicker({
  value,
  onApply,
  className = "",
}: {
  /** The custom range in use, if any (prefills the panel). */
  value: DateRange | null;
  onApply: (range: DateRange) => void;
  className?: string;
}) {
  const today = isoDate();
  const [open, setOpen] = useState(false);
  const [start, setStart] = useState(value?.start ?? daysAgo(9));
  const [end, setEnd] = useState(value?.end ?? today);
  const [error, setError] = useState<string | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const firstInput = useRef<HTMLInputElement>(null);

  // Fresh values each time it opens (compared by text: the parent passes a
  // new object on every render, which must not wipe what's being typed).
  const valueStart = value?.start;
  const valueEnd = value?.end;
  useEffect(() => {
    if (!open) return;
    setStart(valueStart ?? daysAgo(9));
    setEnd(valueEnd ?? today);
    setError(null);
    firstInput.current?.focus();
  }, [open, valueStart, valueEnd, today]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function apply(range: DateRange) {
    if (!range.start || !range.end) return setError("Pick both dates.");
    if (range.start > range.end) return setError("The start date must be before the end date.");
    if (range.end > today) return setError("The end date can't be in the future.");
    if (dayCount(range) > MAX_DAYS) return setError("Pick at most one year.");
    setOpen(false);
    onApply(range);
  }

  const days = start && end && start <= end ? dayCount({ start, end }) : null;

  return (
    <div ref={root} className={`relative ${className}`}>
      <button
        ref={button}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Pick a custom date range"
        title="Custom dates"
        className={`grid size-9 place-items-center rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-accent ${
          open || value ? "bg-accent/10 text-accent" : "text-text-muted hover:bg-surface-muted hover:text-accent"
        }`}
      >
        <CalendarDays aria-hidden size={18} />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Custom date range"
          className="absolute top-full left-1/2 z-40 mt-2 w-[min(20rem,calc(100vw-2rem))] -translate-x-1/2 rounded-xl border border-border bg-surface p-4 text-left shadow-lg"
        >
          <form
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              apply({ start, end });
            }}
            noValidate
            className="flex flex-col gap-3"
          >
            <p className="font-semibold">Custom dates</p>

            <div className="flex flex-wrap gap-1.5">
              {QUICK.map((q) => (
                <button
                  key={q.days}
                  type="button"
                  onClick={() => apply({ start: daysAgo(q.days - 1), end: today })}
                  className="h-8 rounded-full border border-border px-2.5 text-xs font-medium text-text-muted hover:border-accent/40 hover:text-text"
                >
                  {q.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1 text-sm font-medium">
                From
                <input
                  ref={firstInput}
                  type="date"
                  value={start}
                  max={end || today}
                  onChange={(e) => {
                    setStart(e.target.value);
                    setError(null);
                  }}
                  className={`${inputClass} h-11 px-2 text-sm`}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium">
                To
                <input
                  type="date"
                  value={end}
                  min={start}
                  max={today}
                  onChange={(e) => {
                    setEnd(e.target.value);
                    setError(null);
                  }}
                  className={`${inputClass} h-11 px-2 text-sm`}
                />
              </label>
            </div>

            <p role={error ? "alert" : "status"} className={`text-sm ${error ? "text-danger" : "text-text-muted"}`}>
              {error ?? (days ? `${days} ${days === 1 ? "day" : "days"}` : "Pick a start and an end")}
            </p>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm">
                Show report
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
