import {
  computeBalances,
  LedgerError,
  LedgerExpense,
  simplifyDebts,
  splitEqually,
  toPaisa,
  toTaka,
} from './settlement';

const asObject = (m: Map<string, number>) => Object.fromEntries(m);

describe('toPaisa / toTaka', () => {
  it('converts without floating-point drift', () => {
    expect(toPaisa(0.1 + 0.2)).toBe(30);
    expect(toPaisa(1200.5)).toBe(120050);
    expect(toTaka(120050)).toBe(1200.5);
  });
});

describe('splitEqually', () => {
  it('splits an even amount equally', () => {
    expect(asObject(splitEqually(90000, ['a', 'b', 'c']))).toEqual({
      a: 30000,
      b: 30000,
      c: 30000,
    });
  });

  it('gives leftover paisa to the first participants so shares sum exactly', () => {
    const shares = splitEqually(10000, ['a', 'b', 'c']); // ৳100 / 3
    expect(asObject(shares)).toEqual({ a: 3334, b: 3333, c: 3333 });
    expect([...shares.values()].reduce((s, v) => s + v, 0)).toBe(10000);
  });

  it('handles "just me" (one participant)', () => {
    expect(asObject(splitEqually(4550, ['a']))).toEqual({ a: 4550 });
  });

  it.each([
    [0, ['a'], 'positive'],
    [-100, ['a'], 'positive'],
    [10.5, ['a'], 'positive'],
    [100, [], 'at least one participant'],
    [100, ['a', 'a'], 'must not repeat'],
  ])('rejects amount %p with participants %p', (amount, participants, msg) => {
    expect(() => splitEqually(amount, participants)).toThrow(msg);
  });
});

describe('computeBalances', () => {
  const members = ['rafi', 'nila', 'tanvir'];

  it('credits the payer the full amount and debits each participant a share (§9.1)', () => {
    const balances = computeBalances(members, [
      { amount: 90000, paidBy: 'rafi', participants: members },
    ]);
    expect(asObject(balances)).toEqual({
      rafi: 60000,
      nila: -30000,
      tanvir: -30000,
    });
  });

  it('works when the payer is not a participant', () => {
    const balances = computeBalances(members, [
      { amount: 20000, paidBy: 'rafi', participants: ['nila', 'tanvir'] },
    ]);
    expect(asObject(balances)).toEqual({
      rafi: 20000,
      nila: -10000,
      tanvir: -10000,
    });
  });

  it('leaves a "just me" expense paid by yourself at zero', () => {
    const balances = computeBalances(members, [
      { amount: 5000, paidBy: 'nila', participants: ['nila'] },
    ]);
    expect(asObject(balances)).toEqual({ rafi: 0, nila: 0, tanvir: 0 });
  });

  it('accumulates across many expenses', () => {
    const balances = computeBalances(members, [
      { amount: 90000, paidBy: 'rafi', participants: members },
      { amount: 30000, paidBy: 'nila', participants: members },
      { amount: 12000, paidBy: 'tanvir', participants: ['nila', 'tanvir'] },
    ]);
    expect(asObject(balances)).toEqual({
      rafi: 50000,
      nila: -16000,
      tanvir: -34000,
    });
  });

  it('treats a settlement as an expense paid by the debtor for the creditor (§9.3)', () => {
    const balances = computeBalances(
      members,
      [{ amount: 90000, paidBy: 'rafi', participants: members }],
      [
        { from: 'nila', to: 'rafi', amount: 30000 },
        { from: 'tanvir', to: 'rafi', amount: 30000 },
      ],
    );
    expect(asObject(balances)).toEqual({ rafi: 0, nila: 0, tanvir: 0 });
  });

  it('includes members with no activity at zero', () => {
    expect(asObject(computeBalances(['a', 'b'], []))).toEqual({ a: 0, b: 0 });
  });

  it('rejects anyone who is not a member', () => {
    expect(() =>
      computeBalances(members, [
        { amount: 100, paidBy: 'stranger', participants: members },
      ]),
    ).toThrow(LedgerError);
    expect(() =>
      computeBalances(members, [
        { amount: 100, paidBy: 'rafi', participants: ['stranger'] },
      ]),
    ).toThrow('stranger is not a member');
  });

  it('rejects settling with yourself or a non-positive settlement', () => {
    expect(() =>
      computeBalances(members, [], [{ from: 'rafi', to: 'rafi', amount: 100 }]),
    ).toThrow('themselves');
    expect(() =>
      computeBalances(members, [], [{ from: 'rafi', to: 'nila', amount: 0 }]),
    ).toThrow('positive');
  });
});

describe('simplifyDebts', () => {
  it('returns no payments when everyone is settled', () => {
    expect(
      simplifyDebts(
        new Map([
          ['a', 0],
          ['b', 0],
        ]),
      ),
    ).toEqual([]);
  });

  it('collapses a debt chain A→B→C into a single payment A→C', () => {
    // a owes b ৳100, b owes c ৳100 → b nets to zero
    const balances = new Map([
      ['a', -10000],
      ['b', 0],
      ['c', 10000],
    ]);
    expect(simplifyDebts(balances)).toEqual([
      { from: 'a', to: 'c', amount: 10000 },
    ]);
  });

  it('matches the largest debtor with the largest creditor first', () => {
    const balances = new Map([
      ['a', 50000],
      ['b', 20000],
      ['c', -40000],
      ['d', -30000],
    ]);
    expect(simplifyDebts(balances)).toEqual([
      { from: 'c', to: 'a', amount: 40000 },
      { from: 'd', to: 'b', amount: 20000 },
      { from: 'd', to: 'a', amount: 10000 },
    ]);
  });

  it('breaks ties by member id so results are deterministic', () => {
    const balances = new Map([
      ['z', 100],
      ['y', 100],
      ['b', -100],
      ['a', -100],
    ]);
    expect(simplifyDebts(balances)).toEqual([
      { from: 'a', to: 'y', amount: 100 },
      { from: 'b', to: 'z', amount: 100 },
    ]);
  });

  it('does not mutate the balances passed in', () => {
    const balances = new Map([
      ['a', -100],
      ['b', 100],
    ]);
    simplifyDebts(balances);
    expect(asObject(balances)).toEqual({ a: -100, b: 100 });
  });

  it('rejects balances that do not sum to zero', () => {
    expect(() => simplifyDebts(new Map([['a', 100]]))).toThrow('sum to zero');
  });
});

describe('money-correctness invariants (randomised)', () => {
  // Deterministic PRNG so a failure is reproducible.
  const rng = (seed: number) => () => {
    seed = (seed * 1664525 + 1013904223) % 2 ** 32;
    return seed / 2 ** 32;
  };

  it('holds for 500 random groups', () => {
    const rand = rng(42);
    const pick = <T>(xs: T[]) => xs[Math.floor(rand() * xs.length)];

    for (let run = 0; run < 500; run++) {
      const members = Array.from(
        { length: 2 + Math.floor(rand() * 9) },
        (_, i) => `m${i}`,
      );
      const expenses: LedgerExpense[] = Array.from(
        { length: Math.floor(rand() * 30) },
        () => {
          const chosen = members.filter(() => rand() < 0.6);
          return {
            amount: 1 + Math.floor(rand() * 500000),
            paidBy: pick(members),
            participants: chosen.length ? chosen : [pick(members)],
          };
        },
      );

      const balances = computeBalances(members, expenses);

      // 1. Money is conserved: balances always net to zero.
      expect([...balances.values()].reduce((s, b) => s + b, 0)).toBe(0);

      const payments = simplifyDebts(balances);
      const nonZero = [...balances.values()].filter((b) => b !== 0).length;

      // 2. At most n − 1 payments, every one positive and between different people.
      expect(payments.length).toBeLessThanOrEqual(Math.max(nonZero - 1, 0));
      for (const p of payments) {
        expect(p.amount).toBeGreaterThan(0);
        expect(p.from).not.toBe(p.to);
      }

      // 3. Recording every suggested payment settles the group exactly.
      const after = computeBalances(members, expenses, payments);
      expect([...after.values()].every((b) => b === 0)).toBe(true);
    }
  });
});
