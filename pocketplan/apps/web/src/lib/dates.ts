// Calendar dates are local YYYY-MM-DD strings; never round-trip them through UTC.

export function isoDate(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export const currentMonth = () => isoDate().slice(0, 7);

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return isoDate(d).slice(0, 7);
}

export function monthLabel(month: string, { short = false } = {}): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-GB", {
    month: short ? "short" : "long",
    year: "numeric",
  });
}

/** "Today", "Yesterday", or "27 Oct" (with the year when it isn't this year). */
export function dayLabel(date: string): string {
  const today = isoDate();
  if (date === today) return "Today";
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (date === isoDate(yesterday)) return "Yesterday";
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    ...(y !== new Date().getFullYear() && { year: "numeric" }),
  });
}

/** Days left in `month` counting today, or null if it isn't the current month. */
export function daysLeft(month: string): number | null {
  if (month !== currentMonth()) return null;
  const now = new Date();
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return last - now.getDate() + 1;
}
