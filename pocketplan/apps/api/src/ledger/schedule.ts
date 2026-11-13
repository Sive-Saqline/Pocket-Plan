// Occurrence dates for recurring templates (PRD §6.7). Dates are local
// calendar days as YYYY-MM-DD; all maths is on (y, m, d) so time zones and
// daylight saving can never shift a due date.

export const FREQUENCIES = ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'] as const;
export type Frequency = (typeof FREQUENCIES)[number];

type Ymd = [number, number, number];

const parse = (date: string): Ymd => {
  const [y, m, d] = date.split('-').map(Number);
  return [y, m, d];
};
const format = ([y, m, d]: Ymd) =>
  `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
const daysInMonth = (y: number, m: number) => new Date(y, m, 0).getDate();
const dayNumber = ([y, m, d]: Ymd) => Date.UTC(y, m - 1, d) / 86_400_000;
const fromDayNumber = (n: number): Ymd => {
  const dt = new Date(n * 86_400_000);
  return [dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate()];
};

/**
 * The nth occurrence (n = 0 is `start`). Monthly and yearly keep the start's
 * day-of-month, clamped to short months: a 31st bill falls on 28/29 Feb and
 * returns to the 31st in March rather than drifting.
 */
export function occurrence(
  start: string,
  frequency: Frequency,
  n: number,
): string {
  const [y, m, d] = parse(start);
  switch (frequency) {
    case 'DAILY':
      return format(fromDayNumber(dayNumber([y, m, d]) + n));
    case 'WEEKLY':
      return format(fromDayNumber(dayNumber([y, m, d]) + 7 * n));
    case 'MONTHLY': {
      const index = m - 1 + n;
      const year = y + Math.floor(index / 12);
      const month = (((index % 12) + 12) % 12) + 1; // n may be negative
      return format([year, month, Math.min(d, daysInMonth(year, month))]);
    }
    case 'YEARLY':
      return format([y + n, m, Math.min(d, daysInMonth(y + n, m))]);
  }
}

/** Index of the first occurrence on or after `date` (0 if `date` ≤ start). */
function indexOnOrAfter(start: string, frequency: Frequency, date: string) {
  if (date <= start) return 0;
  const [sy, sm] = parse(start);
  const [y, m] = parse(date);
  let n: number;
  switch (frequency) {
    case 'DAILY':
      n = dayNumber(parse(date)) - dayNumber(parse(start));
      break;
    case 'WEEKLY':
      n = Math.floor((dayNumber(parse(date)) - dayNumber(parse(start))) / 7);
      break;
    case 'MONTHLY':
      n = (y - sy) * 12 + (m - sm);
      break;
    case 'YEARLY':
      n = y - sy;
      break;
  }
  // the estimate can be one short (e.g. day-of-month not yet reached)
  while (occurrence(start, frequency, n) < date) n++;
  while (n > 0 && occurrence(start, frequency, n - 1) >= date) n--;
  return n;
}

/** The occurrence after `current` (which should itself be an occurrence). */
export function nextOccurrence(
  start: string,
  frequency: Frequency,
  current: string,
): string {
  const n = indexOnOrAfter(start, frequency, current);
  const at = occurrence(start, frequency, n);
  return occurrence(start, frequency, at === current ? n + 1 : n);
}

/** How many occurrences from `nextDue` up to and including `today` (0 if not due). */
export function dueCount(
  start: string,
  frequency: Frequency,
  nextDue: string,
  today: string,
): number {
  if (nextDue > today) return 0;
  const from = indexOnOrAfter(start, frequency, nextDue);
  let to = indexOnOrAfter(start, frequency, today);
  if (occurrence(start, frequency, to) > today) to--;
  return Math.max(to - from + 1, 1);
}
