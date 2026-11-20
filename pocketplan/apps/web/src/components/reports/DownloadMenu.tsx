"use client";

import { ChevronDown, Download, FileSpreadsheet, FileText } from "lucide-react";
import { useEffect, useRef, useState } from "react";

/**
 * "Download" dropdown with two choices: PDF or CSV. Closes on a choice, a
 * click outside, or Escape (which returns focus to the button).
 */
export function DownloadMenu({
  disabled,
  onPdf,
  onCsv,
}: {
  disabled: boolean;
  onPdf: () => void;
  onCsv: () => void;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const firstItem = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    firstItem.current?.focus();
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

  const choose = (action: () => void) => () => {
    setOpen(false);
    action();
  };

  const items = [
    { label: "PDF", hint: "Print-ready, to save or share", icon: FileText, action: onPdf, ref: firstItem },
    { label: "CSV", hint: "For Excel or Google Sheets", icon: FileSpreadsheet, action: onCsv, ref: undefined },
  ];

  return (
    <div ref={root} className="relative">
      <button
        ref={button}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Download report"
        className={`inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50 ${
          open ? "border-accent/50 bg-accent/10 text-accent" : "border-border text-text-muted hover:border-accent/40 hover:text-accent"
        }`}
      >
        <Download aria-hidden size={15} />
        <span className="hidden sm:inline">Download</span>
        <ChevronDown aria-hidden size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Download as"
          onKeyDown={(e) => {
            // Up/Down move between the two choices
            if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
            e.preventDefault();
            const buttons = [...e.currentTarget.querySelectorAll<HTMLButtonElement>("[role=menuitem]")];
            const i = buttons.indexOf(document.activeElement as HTMLButtonElement);
            buttons[(i + (e.key === "ArrowDown" ? 1 : -1) + buttons.length) % buttons.length]?.focus();
          }}
          className="absolute right-0 z-40 mt-2 w-60 rounded-xl border border-border bg-surface p-1 shadow-lg"
        >
          {items.map((item) => (
            <button
              key={item.label}
              ref={item.ref}
              type="button"
              role="menuitem"
              onClick={choose(item.action)}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-surface-muted focus-visible:bg-surface-muted focus-visible:outline-none"
            >
              <item.icon aria-hidden size={18} className="shrink-0 text-accent" />
              <span className="flex flex-col">
                <span className="text-sm font-semibold">{item.label}</span>
                <span className="text-xs text-text-muted">{item.hint}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
