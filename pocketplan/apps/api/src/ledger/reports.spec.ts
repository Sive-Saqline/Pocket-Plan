import {
  addDays,
  addMonths,
  assertDateRange,
  assertReportRange,
  changePercent,
  dayCount,
  fullMonthsOf,
  isWholeMonths,
  monthsBetween,
  monthsRange,
  personalReport,
  previousOf,
  trendOf,
  type ReportSource,
} from './reports';

describe('monthsBetween', () => {
  it('lists every month, inclusive, across a year boundary', () => {
    expect(monthsBetween('2025-11', '2026-02')).toEqual([
      '2025-11',
      '2025-12',
      '2026-01',
      '2026-02',
    ]);
  });

  it('is a single month when from = to', () => {
    expect(monthsBetween('2026-10', '2026-10')).toEqual(['2026-10']);
  });
});

describe('ranges', () => {
  it('month ranges: 12 months at most, never backwards', () => {
    expect(() => assertReportRange('2025-12', '2026-11')).not.toThrow();
    expect(() => assertReportRange('2025-11', '2026-11')).toThrow('at most 12');
    expect(() => assertReportRange('2026-11', '2026-10')).toThrow('before');
  });

  it('date ranges: real dates, a year at most, never backwards', () => {
    expect(() =>
      assertDateRange({ start: '2025-11-21', end: '2026-11-20' }),
    ).not.toThrow(); // 365 days
    expect(() =>
      assertDateRange({ start: '2024-01-01', end: '2024-12-31' }),
    ).not.toThrow(); // 366 days (leap year)
    expect(() =>
      assertDateRange({ start: '2025-01-01', end: '2026-01-02' }),
    ).toThrow('one year');
    expect(() =>
      assertDateRange({ start: '2026-11-20', end: '2026-11-19' }),
    ).toThrow('before');
    expect(() =>
      assertDateRange({ start: '2026-02-30', end: '2026-03-01' }),
    ).toThrow('not a real date');
  });

  it('counts days and moves dates across months and years', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(addMonths('2026-01', -1)).toBe('2025-12');
    expect(dayCount({ start: '2026-11-05', end: '2026-11-20' })).toBe(16);
    expect(monthsRange('2026-02', '2026-02')).toEqual({
      start: '2026-02-01',
      end: '2026-02-28',
    });
  });

  it('knows whole months and the months a range fully covers', () => {
    expect(isWholeMonths(monthsRange('2026-09', '2026-11'))).toBe(true);
    expect(isWholeMonths({ start: '2026-09-01', end: '2026-11-20' })).toBe(
      false,
    );
    expect(fullMonthsOf({ start: '2026-09-15', end: '2026-11-30' })).toEqual([
      '2026-10',
      '2026-11',
    ]);
    expect(fullMonthsOf({ start: '2026-11-05', end: '2026-11-20' })).toEqual(
      [],
    );
  });
});

describe('previousOf', () => {
  it('whole months: the same number of months just before', () => {
    expect(previousOf(monthsRange('2026-01', '2026-03'))).toEqual(
      monthsRange('2025-10', '2025-12'),
    );
    expect(previousOf(monthsRange('2026-03', '2026-03'))).toEqual(
      monthsRange('2026-02', '2026-02'),
    );
  });

  it('custom ranges: the same number of days just before', () => {
    expect(previousOf({ start: '2026-11-11', end: '2026-11-20' })).toEqual({
      start: '2026-11-01',
      end: '2026-11-10',
    });
  });

  it('change is a whole percent, null with nothing before', () => {
    expect(changePercent(150, 100)).toBe(50);
    expect(changePercent(50, 150)).toBe(-67);
    expect(changePercent(100, 0)).toBeNull();
  });
});

describe('trendOf', () => {
  it('shows short custom ranges by day, everything else by month', () => {
    const short = trendOf({ start: '2026-11-18', end: '2026-11-20' });
    expect(short.by).toBe('day');
    expect(short.keys).toEqual(['2026-11-18', '2026-11-19', '2026-11-20']);
    expect(trendOf(monthsRange('2026-11', '2026-11')).by).toBe('month');
    expect(trendOf({ start: '2026-01-10', end: '2026-06-10' }).keys).toEqual(
      monthsBetween('2026-01', '2026-06'),
    );
  });
});

describe('personalReport', () => {
  const cat = (
    id: string,
    name: string,
    systemKey: 'savings' | null = null,
  ) => ({
    id,
    name,
    icon: 'tag',
    systemKey,
    createdAt: '',
  });
  const wallet = (id: string, name: string) => ({
    id,
    name,
    type: 'CASH' as const,
    balance: 0,
    createdAt: '',
    updatedAt: '',
  });
  const row = (
    date: string,
    categoryId: string,
    accountId: string,
    paisa: number,
  ) => ({ date, categoryId, accountId, paisa, count: 1 });
  const source: ReportSource = {
    categories: [
      cat('food', 'Food'),
      cat('bus', 'Transport'),
      cat('save', 'Savings', 'savings'),
    ],
    accounts: [wallet('cash', 'Cash'), wallet('bkash', 'bKash')],
    budgets: [
      { categoryId: 'food', month: '2026-10', planned: 50_000 },
      { categoryId: 'bus', month: '2026-10', planned: 10_000 },
    ],
    savings: [{ month: '2026-10', target: 100_000 }],
    totals: [
      row('2026-09-30', 'food', 'cash', 10_000), // previous month
      row('2026-10-01', 'food', 'cash', 20_000),
      row('2026-10-20', 'food', 'bkash', 30_000),
      row('2026-10-31', 'bus', 'bkash', 5_000),
      row('2026-10-15', 'save', 'cash', 40_000),
    ],
  };
  const october = monthsRange('2026-10', '2026-10');

  it('without filters: everything, compared with the previous month', () => {
    const r = personalReport(source, october);
    expect(r.total).toBe(950);
    expect(r.previous).toEqual({
      start: '2026-09-01',
      end: '2026-09-30',
      total: 100,
      change: 850,
    });
    expect(r).toMatchObject({
      from: '2026-10',
      to: '2026-10',
      days: 31,
      wholeMonths: true,
      fullMonths: ['2026-10'],
      trendBy: 'month',
      filters: { categories: [], wallets: [] },
    });
    expect(r.savings).toMatchObject({ target: 1000, saved: 400 });
  });

  it('narrows to categories and wallets, budgets to those categories', () => {
    const r = personalReport(source, october, {
      categories: ['food'],
      wallets: ['bkash'],
    });
    expect(r.total).toBe(300);
    expect(r.byCategory.map((c) => c.id)).toEqual(['food']);
    expect(r.byWallet.map((w) => w.id)).toEqual(['bkash']);
    expect(r.previous.total).toBe(0);
    expect(r.budget.lines.map((l) => l.categoryId)).toEqual(['food']);
  });

  it("ignores ids that are not this user's", () => {
    const r = personalReport(source, october, {
      categories: ['someone-else'],
    });
    expect(r.filters.categories).toEqual([]);
    expect(r.total).toBe(950);
  });

  it('custom days: totals by day, compared with the days before; no partial-month budgets', () => {
    const r = personalReport(source, {
      start: '2026-10-11',
      end: '2026-10-20',
    });
    expect(r.total).toBe(700); // 15th and 20th
    expect(r.trendBy).toBe('day');
    expect(r.trend).toHaveLength(10);
    expect(r.trend.find((t) => t.key === '2026-10-15')?.total).toBe(400);
    expect(r.previous).toMatchObject({
      start: '2026-10-01',
      end: '2026-10-10',
      total: 200,
    });
    // budgets and savings are monthly: none for part of a month
    expect(r.fullMonths).toEqual([]);
    expect(r.budget.status).toBe('none');
    expect(r.savings.target).toBeNull();
    expect(r.savings.saved).toBe(0);
  });
});
