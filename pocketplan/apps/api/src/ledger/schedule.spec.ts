import { dueCount, nextOccurrence, occurrence } from './schedule';

describe('occurrence', () => {
  it('steps daily and weekly across month and year ends', () => {
    expect(occurrence('2026-12-30', 'DAILY', 3)).toBe('2027-01-02');
    expect(occurrence('2026-10-28', 'WEEKLY', 1)).toBe('2026-11-04');
    expect(occurrence('2026-12-29', 'WEEKLY', 1)).toBe('2027-01-05');
  });

  it('keeps the day of month, clamping short months without drifting', () => {
    const jan31 = (n: number) => occurrence('2026-01-31', 'MONTHLY', n);
    expect([0, 1, 2, 3, 4].map(jan31)).toEqual([
      '2026-01-31',
      '2026-02-28',
      '2026-03-31', // back to the 31st, not stuck on the 28th
      '2026-04-30',
      '2026-05-31',
    ]);
    expect(occurrence('2026-11-15', 'MONTHLY', 2)).toBe('2027-01-15');
  });

  it('steps backwards for negative n', () => {
    expect(occurrence('2026-01-31', 'MONTHLY', -2)).toBe('2025-11-30');
    expect(occurrence('2026-10-28', 'WEEKLY', -2)).toBe('2026-10-14');
  });

  it('handles leap days for yearly templates', () => {
    expect(occurrence('2028-02-29', 'YEARLY', 1)).toBe('2029-02-28');
    expect(occurrence('2028-02-29', 'YEARLY', 4)).toBe('2032-02-29');
  });
});

describe('nextOccurrence', () => {
  it.each([
    ['2026-10-01', 'DAILY', '2026-10-28', '2026-10-29'],
    ['2026-10-07', 'WEEKLY', '2026-10-28', '2026-11-04'],
    ['2026-01-31', 'MONTHLY', '2026-02-28', '2026-03-31'],
    ['2026-08-25', 'MONTHLY', '2026-10-25', '2026-11-25'],
    ['2026-12-31', 'MONTHLY', '2026-12-31', '2027-01-31'],
    ['2024-02-29', 'YEARLY', '2027-02-28', '2028-02-29'],
  ] as const)(
    'start %s %s: after %s comes %s',
    (start, frequency, current, next) => {
      expect(nextOccurrence(start, frequency, current)).toBe(next);
    },
  );

  it('confirming every occurrence walks the schedule without gaps', () => {
    let due = '2026-01-31';
    const seen: string[] = [];
    for (let i = 0; i < 13; i++) {
      seen.push(due);
      due = nextOccurrence('2026-01-31', 'MONTHLY', due);
    }
    expect(seen).toEqual(
      Array.from({ length: 13 }, (_, n) =>
        occurrence('2026-01-31', 'MONTHLY', n),
      ),
    );
    expect(due).toBe('2027-02-28');
  });
});

describe('dueCount', () => {
  it('is 0 before the due date', () => {
    expect(dueCount('2026-10-25', 'MONTHLY', '2026-11-25', '2026-10-28')).toBe(
      0,
    );
  });

  it('counts the due occurrence, including today', () => {
    expect(dueCount('2026-10-28', 'MONTHLY', '2026-10-28', '2026-10-28')).toBe(
      1,
    );
  });

  it('counts missed occurrences', () => {
    // monthly on the 5th, last confirmed for July: Aug, Sep, Oct are due
    expect(dueCount('2026-01-05', 'MONTHLY', '2026-08-05', '2026-10-28')).toBe(
      3,
    );
    // weekly, three weeks behind
    expect(dueCount('2026-10-07', 'WEEKLY', '2026-10-07', '2026-10-28')).toBe(
      4,
    );
  });
});
