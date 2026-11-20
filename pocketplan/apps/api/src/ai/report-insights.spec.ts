import {
  factsOf,
  narrationFrom,
  reportViewFrom,
  type NarratedReport,
  type ReportView,
} from './report-insights';
import type { PersonalOptions } from './suggestions';

const TODAY = '2026-11-20';

const options: PersonalOptions = {
  categories: [
    { id: 'cat-food', name: 'Food' },
    { id: 'cat-transport', name: 'Transport' },
  ],
  wallets: [{ id: 'w-bkash', name: 'bKash', type: 'MOBILE_WALLET' }],
  groups: [{ id: 'g-flat', name: 'Flatmates' }],
};

const current: ReportView = {
  start: '2026-06-01',
  end: '2026-11-30',
  groupId: null,
  categories: [],
  wallets: [],
};

describe('reportViewFrom', () => {
  it('keeps offered ids and a valid range', () => {
    expect(
      reportViewFrom(
        {
          start: '2026-10-01',
          end: '2026-10-31',
          groupId: null,
          categoryIds: ['cat-food', 'cat-food', 'someone-elses'],
          walletIds: ['w-bkash', 'w-x'],
          groupCategories: ['food'],
        },
        options,
        current,
        TODAY,
      ),
    ).toEqual({
      start: '2026-10-01',
      end: '2026-10-31',
      groupId: null,
      categories: ['cat-food'],
      wallets: ['w-bkash'],
    });
  });

  it('accepts any number of days, e.g. the last 10', () => {
    expect(
      reportViewFrom(
        { start: '2026-11-11', end: '2026-11-20' },
        options,
        current,
        TODAY,
      ),
    ).toMatchObject({ start: '2026-11-11', end: '2026-11-20' });
  });

  it('keeps the current view for anything missing, impossible or in a later month', () => {
    expect(
      reportViewFrom(
        { start: '2026-02-30', end: '2026-12-01', groupId: 'g-x' },
        options,
        current,
        TODAY,
      ),
    ).toEqual(current);
  });

  it('swaps a reversed range and caps it at a year', () => {
    expect(
      reportViewFrom(
        { start: '2026-11-20', end: '2026-11-01' },
        options,
        current,
        TODAY,
      ),
    ).toMatchObject({ start: '2026-11-01', end: '2026-11-20' });
    expect(
      reportViewFrom(
        { start: '2024-01-01', end: '2026-11-20' },
        options,
        current,
        TODAY,
      ),
    ).toMatchObject({ start: '2025-11-20', end: '2026-11-20' });
  });

  it('uses group category keys (and no wallets) for a group', () => {
    expect(
      reportViewFrom(
        {
          groupId: 'g-flat',
          categoryIds: ['cat-food'],
          walletIds: ['w-bkash'],
          groupCategories: ['groceries', 'casino'],
        },
        options,
        current,
        TODAY,
      ),
    ).toEqual({
      ...current,
      groupId: 'g-flat',
      categories: ['groceries'],
      wallets: [],
    });
  });
});

const report: NarratedReport = {
  scope: 'personal',
  start: '2026-09-01',
  end: '2026-11-30',
  days: 91,
  fullMonths: ['2026-09', '2026-10', '2026-11'],
  total: 9000,
  count: 12,
  filters: { categories: [], wallets: [] },
  previous: {
    start: '2026-06-01',
    end: '2026-08-31',
    total: 6000,
    change: 50,
  },
  byCategory: [{ id: 'cat-food', name: 'Food', total: 9000, share: 100 }],
  byWallet: [{ name: 'Cash', total: 9000, share: 100 }],
  trendBy: 'month',
  trend: [
    { key: '2026-09', total: 2000, count: 3 },
    { key: '2026-10', total: 4000, count: 5 },
    { key: '2026-11', total: 3000, count: 4 },
  ],
  budget: {
    planned: 8000,
    spent: 9000,
    percent: 112,
    status: 'over',
    lines: [{ name: 'Food', planned: 8000, spent: 9000, status: 'over' }],
  },
  savings: { target: 1000, saved: 500, percent: 50 },
};
const names = {
  categories: new Map([['cat-food', 'Food']]),
  wallets: new Map([['w-bkash', 'bKash']]),
};

describe('factsOf', () => {
  it('gives worked-out numbers and a baseline from complete months only', () => {
    const facts = factsOf(report, names, TODAY);
    expect(facts.period).toEqual({
      from: 'September 2026',
      to: 'November 2026',
      inProgress: true,
    });
    expect(facts.previousPeriod).toMatchObject({
      from: 'June 2026',
      to: 'August 2026',
      changePercent: 50,
    });
    // September and October only: November isn't over
    expect(facts.forecastBaseline).toBe(3000);
    expect(facts.budget?.overBudget).toEqual([
      { name: 'Food', planned: 8000, spent: 9000 },
    ]);
    expect(facts.savings).toEqual({ target: 1000, saved: 500, percent: 50 });
  });

  it('leaves out budget and savings when filtered, and names the filters', () => {
    const facts = factsOf(
      {
        ...report,
        filters: { categories: ['cat-food'], wallets: ['w-bkash'] },
      },
      names,
      TODAY,
    );
    expect(facts.filteredTo).toEqual({
      categories: ['Food'],
      wallets: ['bKash'],
    });
    expect(facts.budget).toBeUndefined();
    expect(facts.savings).toBeUndefined();
  });

  it('custom days: labelled by date, spending days only, baseline from the daily average', () => {
    const days = Array.from({ length: 10 }, (_, i) => ({
      key: `2026-11-${String(11 + i).padStart(2, '0')}`,
      total: i === 0 ? 1000 : 0,
      count: i === 0 ? 1 : 0,
    }));
    const facts = factsOf(
      {
        ...report,
        start: '2026-11-11',
        end: '2026-11-20',
        days: 10,
        fullMonths: [],
        total: 1000,
        trendBy: 'day',
        trend: days,
        budget: { planned: null, spent: 0, percent: null, status: 'none' },
      },
      names,
      TODAY,
    );
    expect(facts.period).toMatchObject({
      from: '11 Nov 2026',
      to: '20 Nov 2026',
      days: 10,
    });
    expect(facts).toHaveProperty('byDay', [
      { day: '11 Nov 2026', total: 1000 },
    ]);
    expect(facts.forecastBaseline).toBe(3000); // ৳100 a day × 30
  });

  it('has no baseline when no month in view is complete', () => {
    expect(
      factsOf(
        {
          ...report,
          start: '2026-11-01',
          fullMonths: ['2026-11'],
          trend: [report.trend[2]],
        },
        names,
        TODAY,
      ).forecastBaseline,
    ).toBeNull();
  });
});

describe('narrationFrom', () => {
  it('keeps trimmed strings and drops anything else', () => {
    expect(
      narrationFrom({ answer: '  Food: ৳9,000  ', summary: 5, notable: null }),
    ).toEqual({
      answer: 'Food: ৳9,000',
      summary: '',
      notable: '',
      forecast: '',
    });
    expect(narrationFrom('nope').summary).toBe('');
  });
});
