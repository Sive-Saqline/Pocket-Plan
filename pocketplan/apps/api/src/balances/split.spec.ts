import { allocate, computeSplit, SplitType } from './split';
import { computeBalances, LedgerError, simplifyDebts } from './settlement';

const amounts = (shares: { userId: string; amount: number }[]) =>
  Object.fromEntries(shares.map((s) => [s.userId, s.amount]));

describe('allocate (largest remainder)', () => {
  it('splits proportionally and places leftover paisa on the largest remainders', () => {
    // ৳100 in 1:1:1 -> 33.34 / 33.33 / 33.33
    expect(allocate(10000, [1, 1, 1])).toEqual([3334, 3333, 3333]);
    // ৳10 in 2:1 -> 6.67 / 3.33
    expect(allocate(1000, [2, 1])).toEqual([667, 333]);
  });

  it('copes with very large amounts without losing precision', () => {
    const parts = allocate(1_000_000_000, [3_333_333, 3_333_333, 3_333_334]);
    expect(parts.reduce((s, p) => s + p, 0)).toBe(1_000_000_000);
  });
});

describe('computeSplit', () => {
  const people = (...ids: string[]) => ids.map((userId) => ({ userId }));

  it('EQUAL: everyone pays the same, leftover paisa to the first people', () => {
    expect(
      amounts(computeSplit(10000, 'EQUAL', people('a', 'b', 'c'))),
    ).toEqual({ a: 3334, b: 3333, c: 3333 });
  });

  it('EQUAL with one person is "just me"', () => {
    expect(computeSplit(4550, 'EQUAL', people('a'))).toEqual([
      { userId: 'a', amount: 4550, value: null },
    ]);
  });

  it('EXACT: uses the typed amounts when they add up', () => {
    const shares = computeSplit(150000, 'EXACT', [
      { userId: 'a', value: 1000 },
      { userId: 'b', value: 499.5 },
      { userId: 'c', value: 0.5 },
    ]);
    expect(amounts(shares)).toEqual({ a: 100000, b: 49950, c: 50 });
  });

  it('EXACT: refuses amounts that do not add up', () => {
    expect(() =>
      computeSplit(150000, 'EXACT', [
        { userId: 'a', value: 1000 },
        { userId: 'b', value: 400 },
      ]),
    ).toThrow('The amounts add up to ৳1400, not ৳1500');
  });

  it('PERCENTAGE: 50 / 30 / 20 of ৳999.99', () => {
    const shares = computeSplit(99999, 'PERCENTAGE', [
      { userId: 'a', value: 50 },
      { userId: 'b', value: 30 },
      { userId: 'c', value: 20 },
    ]);
    // 49999.5 / 29999.7 / 19999.8: the 2 leftover paisa go to the .8 and .7
    expect(amounts(shares)).toEqual({ a: 49999, b: 30000, c: 20000 });
  });

  it('PERCENTAGE: must total 100', () => {
    expect(() =>
      computeSplit(1000, 'PERCENTAGE', [
        { userId: 'a', value: 60 },
        { userId: 'b', value: 30 },
      ]),
    ).toThrow('The percentages add up to 90%, not 100%');
  });

  it('SHARES: 2 shares cost twice as much as 1', () => {
    const shares = computeSplit(90000, 'SHARES', [
      { userId: 'a', value: 2 },
      { userId: 'b', value: 1 },
    ]);
    expect(amounts(shares)).toEqual({ a: 60000, b: 30000 });
    expect(shares[0].value).toBe(2);
  });

  it.each<[SplitType, number | undefined]>([
    ['EXACT', 0],
    ['PERCENTAGE', -5],
    ['SHARES', 1.234],
    ['SHARES', undefined],
  ])('%s refuses the value %p', (type, value) => {
    expect(() =>
      computeSplit(1000, type, [
        { userId: 'a', value },
        { userId: 'b', value: 1 },
      ]),
    ).toThrow(LedgerError);
  });

  it('refuses no people, repeated people and non-positive amounts', () => {
    expect(() => computeSplit(1000, 'EQUAL', [])).toThrow(LedgerError);
    expect(() => computeSplit(1000, 'EQUAL', people('a', 'a'))).toThrow(
      LedgerError,
    );
    expect(() => computeSplit(0, 'EQUAL', people('a'))).toThrow(LedgerError);
  });

  it('always adds up exactly, for 2,000 random splits of every kind', () => {
    let seed = 42;
    const rand = (n: number) => {
      seed = (seed * 1103515245 + 12345) % 2 ** 31;
      return seed % n;
    };
    for (let i = 0; i < 2000; i++) {
      const amount = 1 + rand(10_000_000);
      const n = 1 + rand(8);
      const ids = Array.from({ length: n }, (_, k) => `m${k}`);
      const type = (['EQUAL', 'PERCENTAGE', 'SHARES'] as const)[rand(3)];
      let inputs = ids.map((userId) => ({
        userId,
        value: 1 + rand(500) / 100,
      }));
      if (type === 'PERCENTAGE') {
        // percentages in hundredths that add up to exactly 100.00
        const cuts = ids.map(() => 1 + rand(1000));
        const parts = allocate(10_000, cuts).map((p) => Math.max(p, 0));
        if (parts.some((p) => p === 0)) continue;
        inputs = ids.map((userId, k) => ({ userId, value: parts[k] / 100 }));
      }
      const shares = computeSplit(amount, type, inputs);
      expect(shares.reduce((s, x) => s + x.amount, 0)).toBe(amount);
      expect(shares.every((x) => x.amount >= 0)).toBe(true);
    }
  });
});

describe('balances from stored shares', () => {
  it('uses each expense’s own shares, and still sums to zero', () => {
    const members = ['a', 'b', 'c'];
    const expenses = [
      {
        amount: 90000,
        paidBy: 'a',
        shares: computeSplit(90000, 'SHARES', [
          { userId: 'a', value: 1 },
          { userId: 'b', value: 2 },
        ]),
      },
      {
        amount: 10000,
        paidBy: 'c',
        shares: computeSplit(10000, 'PERCENTAGE', [
          { userId: 'a', value: 25 },
          { userId: 'c', value: 75 },
        ]),
      },
    ];
    const balances = computeBalances(members, expenses);
    // a paid 900, owes 300 + 25 -> +575; b owes 600; c paid 100, owes 75 -> +25
    expect(Object.fromEntries(balances)).toEqual({
      a: 57500,
      b: -60000,
      c: 2500,
    });
    const payments = simplifyDebts(balances);
    expect(payments).toEqual([
      { from: 'b', to: 'a', amount: 57500 },
      { from: 'b', to: 'c', amount: 2500 },
    ]);
  });

  it('refuses stored shares that do not add up', () => {
    expect(() =>
      computeBalances(
        ['a', 'b'],
        [
          {
            amount: 1000,
            paidBy: 'a',
            shares: [
              { userId: 'a', amount: 500 },
              { userId: 'b', amount: 400 },
            ],
          },
        ],
      ),
    ).toThrow('Shares must add up to the expense amount');
  });
});
