// Download a report (Reports page) as CSV or as a print-ready page the
// browser saves as PDF. Everything is built in the browser from the report
// already on screen: no server round trip. The browser's PDF output is used
// on purpose: it renders Bangla text and the ৳ sign, which PDF libraries'
// built-in fonts can't.

import { monthLabel } from "./dates";
import { formatTaka } from "./money";
import { dayCount, dayRangeLabel, isWholeMonths, shortDate, type DateRange, type Insights, type Report } from "./reports";

/** What the page knows that the report doesn't: names and what's shown. */
export interface ExportContext {
  /** "My spending" or "Group: Flatmates" */
  scope: string;
  /** e.g. "Food, bKash"; empty when not filtered */
  filters: string;
  /** Display name for a by-category row (group rows only carry a key). */
  categoryName: (row: { id: string; icon: string; name?: string }) => string;
  /** Mirrors the page: hidden while filtering would make them misleading. */
  showBudget: boolean;
  showSavings: boolean;
  /** AI insights, when the user generated them for this view. */
  insights?: Insights | null;
}

/** "November 2026", "Sep 2026 – Nov 2026", or "5 – 20 Nov 2026 (16 days)". */
const period = (range: DateRange) => {
  if (!isWholeMonths(range)) {
    const days = dayCount(range);
    return `${dayRangeLabel(range)} (${days} ${days === 1 ? "day" : "days"})`;
  }
  const from = range.start.slice(0, 7);
  const to = range.end.slice(0, 7);
  return from === to ? monthLabel(to) : `${monthLabel(from, { short: true })} – ${monthLabel(to, { short: true })}`;
};

/** A trend column's label: "November 2026" or "5 Nov 2026". */
const trendLabel = (r: Report, key: string) => (r.trendBy === "month" ? monthLabel(key) : shortDate(key));

const amount = (n: number) => n.toFixed(2);

export function exportFileName(r: Report, ext: "csv" | "pdf") {
  const [first, last] = r.wholeMonths ? [r.from, r.to] : [r.start, r.end];
  const range = first === last ? first : `${first}_to_${last}`;
  const scope = r.scope === "group" ? `-${slug(r.group.name)}` : "";
  return `pocketplan-report${scope}-${range}.${ext}`;
}

// --- CSV ------------------------------------------------------------------

/**
 * One file, several small tables one after another (blank line between),
 * which Excel, Google Sheets and Numbers all open as-is.
 */
export function reportCsv(r: Report, ctx: ExportContext): string {
  const rows: (string | number)[][] = [
    ["PocketPlan report"],
    ["Scope", ctx.scope],
    ["Period", period(r)],
    ["Filtered to", ctx.filters || "Nothing (all spending)"],
    ["Total (BDT)", amount(r.total)],
    ["Expenses", r.count],
    [
      "Previous period",
      period(r.previous),
      amount(r.previous.total),
      r.previous.change === null ? "" : `${r.previous.change}%`,
    ],
    [],
    [r.trendBy === "month" ? "By month" : "By day"],
    [r.trendBy === "month" ? "Month" : "Day", "Total (BDT)", "Expenses"],
    ...r.trend.map((t) => [trendLabel(r, t.key), amount(t.total), t.count]),
    [],
    ["By category"],
    ["Category", "Total (BDT)", "Share (%)"],
    ...r.byCategory.map((c) => [ctx.categoryName(c), amount(c.total), c.share]),
    [],
  ];

  if (r.scope === "personal") {
    rows.push(
      ["By wallet"],
      ["Wallet", "Total (BDT)", "Share (%)"],
      ...r.byWallet.map((w) => [w.name, amount(w.total), w.share]),
      [],
    );
    if (ctx.showBudget && r.budget.lines.length) {
      rows.push(
        ["Budget use"],
        ["Category", "Planned (BDT)", "Spent (BDT)", "Remaining (BDT)", "Used (%)", "Status"],
        ...r.budget.lines.map((l) => [l.name, amount(l.planned), amount(l.spent), amount(l.remaining), l.percent, l.status]),
        [],
      );
    }
    if (ctx.showSavings && (r.savings.target !== null || r.savings.saved > 0)) {
      rows.push(
        ["Savings progress"],
        ["Month", "Saved (BDT)", "Target (BDT)"],
        ...r.savings.months.map((m) => [monthLabel(m.month), amount(m.saved), m.target === null ? "" : amount(m.target)]),
        [],
      );
    }
  } else {
    rows.push(
      ["By person"],
      ["Name", "Paid (BDT)", "Share (BDT)"],
      ...r.byMember.map((m) => [m.active ? m.name : `${m.name} (left)`, amount(m.paid), amount(m.share)]),
      [],
    );
    if (ctx.showBudget && r.budget.planned !== null) {
      rows.push(
        ["Budget use"],
        ["Planned (BDT)", "Spent (BDT)", "Used (%)", "Status"],
        [amount(r.budget.planned), amount(r.budget.spent), r.budget.percent ?? "", r.budget.status],
        [],
      );
    }
  }

  if (ctx.insights) {
    rows.push(
      ["AI insights (written by AI from the numbers above; information, not advice)"],
      ...[ctx.insights.summary, ctx.insights.notable, ctx.insights.forecast].filter(Boolean).map((line) => [line]),
    );
  }

  // BOM: Excel opens UTF-8 (Bangla names, ৳) correctly only with it.
  return "﻿" + rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
}

/**
 * Quotes when needed. Text starting with = + - @ is prefixed with ' so a
 * spreadsheet never runs a name like "=HYPERLINK(...)" as a formula.
 */
function csvCell(value: string | number): string {
  if (typeof value === "number") return String(value);
  let s = value;
  if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function downloadText(fileName: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// --- PDF (print-ready page) ---------------------------------------------------

/** Opens the browser's print dialog on a clean copy of the report ("Save as PDF"). */
export function printReport(r: Report, ctx: ExportContext) {
  const title = exportFileName(r, "pdf").replace(/\.pdf$/, "");
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
  document.body.appendChild(frame);

  const doc = frame.contentDocument!;
  doc.open();
  doc.write(reportHtml(r, ctx, title));
  doc.close();

  // Most browsers name the PDF after the page title.
  const pageTitle = document.title;
  const cleanUp = () => {
    document.title = pageTitle;
    frame.remove();
  };
  setTimeout(() => {
    try {
      document.title = title;
      frame.contentWindow!.focus();
      frame.contentWindow!.print();
    } finally {
      // print() blocks until the dialog closes in most browsers
      setTimeout(cleanUp, 500);
    }
  }, 150);
}

function reportHtml(r: Report, ctx: ExportContext, title: string): string {
  const esc = (s: string | number) =>
    String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
  const money = (n: number) => esc(formatTaka(n));
  const bar = (share: number) =>
    `<span class="bar"><span style="width:${Math.min(Math.max(share, 1), 100)}%"></span></span>`;
  const p = r.previous;
  const comparison =
    p.change === null
      ? `Nothing spent in ${esc(period(p))} to compare with.`
      : `${p.change === 0 ? "Same as" : `${Math.abs(p.change)}% ${p.change > 0 ? "more" : "less"} than`} ${esc(
          period(p),
        )} (${money(p.total)})`;
  const maxMonth = Math.max(...r.trend.map((t) => t.total), 0);

  const sections: string[] = [];
  if (ctx.insights) {
    const lines = [ctx.insights.summary, ctx.insights.notable, ctx.insights.forecast].filter(Boolean);
    sections.push(`<section class="insights"><h2>AI insights</h2><ul>${lines
      .map((l) => `<li>${esc(l)}</li>`)
      .join("")}</ul><p class="muted small">Written by AI from the numbers in this report. Information, not advice.</p></section>`);
  }
  if (r.trend.length > 1) {
    sections.push(`<section><h2>By ${r.trendBy}</h2><table><thead><tr><th>${r.trendBy === "month" ? "Month" : "Day"}</th><th class="num">Total</th><th class="num">Expenses</th><th></th></tr></thead><tbody>${r.trend
      .map(
        (t) =>
          `<tr><td>${esc(trendLabel(r, t.key))}</td><td class="num">${money(t.total)}</td><td class="num">${t.count}</td><td class="barcell">${bar(
            maxMonth ? (t.total / maxMonth) * 100 : 0,
          )}</td></tr>`,
      )
      .join("")}</tbody></table></section>`);
  }
  sections.push(`<section><h2>By category</h2><table><thead><tr><th>Category</th><th class="num">Share</th><th class="num">Total</th><th></th></tr></thead><tbody>${r.byCategory
    .map(
      (c) =>
        `<tr><td>${esc(ctx.categoryName(c))}</td><td class="num">${c.share}%</td><td class="num">${money(c.total)}</td><td class="barcell">${bar(c.share)}</td></tr>`,
    )
    .join("")}</tbody></table></section>`);

  if (r.scope === "personal") {
    sections.push(`<section><h2>By wallet</h2><table><thead><tr><th>Wallet</th><th class="num">Share</th><th class="num">Total</th><th></th></tr></thead><tbody>${r.byWallet
      .map(
        (w) =>
          `<tr><td>${esc(w.name)}</td><td class="num">${w.share}%</td><td class="num">${money(w.total)}</td><td class="barcell">${bar(w.share)}</td></tr>`,
      )
      .join("")}</tbody></table></section>`);
    if (ctx.showBudget && r.budget.lines.length) {
      sections.push(`<section><h2>Budget use</h2><p class="muted">${money(r.budget.spent)} of ${money(r.budget.planned)} planned${
        r.budget.percent === null ? "" : ` (${r.budget.percent}%)`
      }</p><table><thead><tr><th>Category</th><th class="num">Planned</th><th class="num">Spent</th><th class="num">Remaining</th><th class="num">Used</th></tr></thead><tbody>${r.budget.lines
        .map(
          (l) =>
            `<tr><td>${esc(l.name)}</td><td class="num">${money(l.planned)}</td><td class="num">${money(l.spent)}</td><td class="num">${money(
              l.remaining,
            )}</td><td class="num">${l.percent}%${l.status === "over" ? " (over)" : ""}</td></tr>`,
        )
        .join("")}</tbody></table></section>`);
    }
    if (ctx.showSavings && (r.savings.target !== null || r.savings.saved > 0)) {
      sections.push(`<section><h2>Savings progress</h2><p class="muted">Saved ${money(r.savings.saved)}${
        r.savings.target === null ? "" : ` of ${money(r.savings.target)} target`
      }</p><table><thead><tr><th>Month</th><th class="num">Saved</th><th class="num">Target</th></tr></thead><tbody>${r.savings.months
        .map(
          (m) =>
            `<tr><td>${esc(monthLabel(m.month))}</td><td class="num">${money(m.saved)}</td><td class="num">${
              m.target === null ? "—" : money(m.target)
            }</td></tr>`,
        )
        .join("")}</tbody></table></section>`);
    }
  } else {
    sections.push(`<section><h2>By person</h2><table><thead><tr><th>Name</th><th class="num">Paid</th><th class="num">Their share</th></tr></thead><tbody>${r.byMember
      .map(
        (m) =>
          `<tr><td>${esc(m.name)}${m.active ? "" : " (left)"}</td><td class="num">${money(m.paid)}</td><td class="num">${money(m.share)}</td></tr>`,
      )
      .join("")}</tbody></table></section>`);
    if (ctx.showBudget && r.budget.planned !== null) {
      sections.push(`<section><h2>Budget use</h2><p>${money(r.budget.spent)} of ${money(r.budget.planned)} planned${
        r.budget.percent === null ? "" : ` (${r.budget.percent}%)`
      }</p></section>`);
    }
  }

  const generated = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(title)}</title><style>
    @page { size: A4; margin: 16mm 14mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { margin: 0; color: #0f1b1f; font: 11pt/1.45 "Segoe UI", "Noto Sans", "Noto Sans Bengali", "Nirmala UI", system-ui, sans-serif; }
    header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #1f7a8c; padding-bottom: 8px; margin-bottom: 14px; }
    .brand { font-size: 16pt; font-weight: 700; color: #1f7a8c; }
    h1 { font-size: 13pt; margin: 2px 0 0; }
    h2 { font-size: 11.5pt; margin: 0 0 6px; }
    .muted { color: #5b6b70; } .small { font-size: 9pt; }
    .total { display: flex; gap: 28px; margin-bottom: 14px; padding: 10px 12px; background: #eef5f6; border-radius: 6px; }
    .total .big { font-size: 18pt; font-weight: 700; }
    section { margin-bottom: 16px; break-inside: avoid; }
    table { width: 100%; border-collapse: collapse; font-size: 10pt; }
    th, td { text-align: left; padding: 4px 6px; border-bottom: 1px solid #dde5e7; }
    th { color: #5b6b70; font-weight: 600; }
    .num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
    .barcell { width: 28%; }
    .bar { display: block; height: 7px; background: #e3eaec; border-radius: 4px; overflow: hidden; }
    .bar span { display: block; height: 100%; background: #1f7a8c; }
    .insights { padding: 10px 12px; border: 1px solid #b9d9df; border-radius: 6px; }
    .insights ul { margin: 0 0 6px; padding-left: 18px; }
    footer { margin-top: 18px; font-size: 8.5pt; color: #5b6b70; }
  </style></head><body>
    <header>
      <div><div class="brand">PocketPlan</div><h1>${esc(ctx.scope)} · ${esc(period(r))}</h1>
      ${ctx.filters ? `<div class="muted">Showing only: ${esc(ctx.filters)}</div>` : ""}</div>
      <div class="muted small">Generated ${esc(generated)}</div>
    </header>
    <div class="total">
      <div><div class="muted small">Total spent</div><div class="big">${money(r.total)}</div></div>
      <div><div class="muted small">Expenses</div><div class="big">${r.count}</div></div>
      ${r.scope === "group" ? `<div><div class="muted small">Your share</div><div class="big">${money(r.myShare)}</div></div>` : ""}
    </div>
    <p class="muted" style="margin:-6px 0 14px">${comparison}</p>
    ${sections.join("")}
    <footer>Amounts in Bangladeshi taka (৳). ${r.scope === "personal" ? "Personal spending only; group shares are reported per group." : ""}</footer>
  </body></html>`;
}

function slug(name: string) {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "group"
  );
}
