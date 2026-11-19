import { assertReportRange, monthsBetween } from './reports';

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

describe('assertReportRange', () => {
  it('allows up to 12 months', () => {
    expect(() => assertReportRange('2025-12', '2026-11')).not.toThrow();
  });

  it('rejects 13 months and backwards ranges', () => {
    expect(() => assertReportRange('2025-11', '2026-11')).toThrow('at most 12');
    expect(() => assertReportRange('2026-11', '2026-10')).toThrow('before');
  });
});
