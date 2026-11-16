import { budgetStatus, budgetView } from './budgets';
import { UserLedger } from './ledger.types';

const at = '2026-10-01T00:00:00.000Z';
const ledger = (): UserLedger => ({
  categories: [
    { id: 'food', name: 'Food', icon: 'food', systemKey: null, createdAt: at },
    {
      id: 'transport',
      name: 'Transport',
      icon: 'transport',
      systemKey: null,
      createdAt: at,
    },
    {
      id: 'shopping',
      name: 'Shopping',
      icon: 'shopping',
      systemKey: null,
      createdAt: at,
    },
    {
      id: 'health',
      name: 'Health',
      icon: 'health',
      systemKey: null,
      createdAt: at,
    },
  ],
  accounts: [],
  expenses: [
    ['food', 3000, '2026-10-02'],
    ['food', 0.1, '2026-10-03'],
    ['food', 0.2, '2026-10-04'],
    ['transport', 660, '2026-10-05'],
    ['shopping', 4450, '2026-10-06'],
    ['health', 340, '2026-10-07'],
    ['food', 9999, '2026-09-30'], // other month
  ].map(([categoryId, amount, expenseDate], i) => ({
    id: `e${i}`,
    accountId: 'cash',
    categoryId: categoryId as string,
    amount: amount as number,
    expenseDate: expenseDate as string,
    description: '',
    createdAt: at,
    updatedAt: at,
  })),
  recurring: [],
  savings: [],
  budgets: [
    ['food', 6000, '2026-10'],
    ['transport', 750, '2026-10'],
    ['shopping', 4000, '2026-10'],
    ['health', 100, '2026-09'], // other month
  ].map(([categoryId, plannedAmount, month], i) => ({
    id: `b${i}`,
    categoryId: categoryId as string,
    plannedAmount: plannedAmount as number,
    month: month as string,
    createdAt: at,
    updatedAt: at,
  })),
});

describe('budgetStatus (EXPERIENCE.md §5.6)', () => {
  it.each([
    [0, null, 'none'],
    [0, 10000, 'under'],
    [7999, 10000, 'under'],
    [8000, 10000, 'near'], // exactly 80%
    [9999, 10000, 'near'],
    [10000, 10000, 'over'], // exactly 100% counts as at/over
    [10500, 10000, 'over'],
  ])('spent %p of %p paisa → %p', (spent, planned, status) => {
    expect(budgetStatus(spent, planned)).toBe(status);
  });
});

describe('budgetView', () => {
  const view = budgetView(ledger(), '2026-10');
  const line = (id: string) => view.lines.find((l) => l.categoryId === id)!;

  it('computes planned vs spent per category for the month only', () => {
    expect(line('food')).toMatchObject({
      planned: 6000,
      spent: 3000.3,
      remaining: 2999.7,
      percent: 50,
      status: 'under',
    });
    expect(line('transport')).toMatchObject({ percent: 88, status: 'near' });
    expect(line('shopping')).toMatchObject({
      remaining: -450,
      percent: 111,
      status: 'over',
    });
  });

  it('marks categories without a budget this month as not budgeted', () => {
    expect(line('health')).toMatchObject({
      planned: null,
      spent: 340,
      remaining: null,
      percent: null,
      status: 'none',
    });
  });

  it('totals planned against budgeted spending, and all spending separately', () => {
    expect(view).toMatchObject({
      planned: 10750,
      spentOnBudgeted: 8110.3,
      spent: 8450.3,
    });
  });

  it('lists budgeted categories first, fullest first', () => {
    expect(view.lines.map((l) => l.categoryId)).toEqual([
      'shopping',
      'transport',
      'food',
      'health',
    ]);
  });

  it('never shows 100% for a budget that is not yet reached', () => {
    const l = ledger();
    l.expenses = [{ ...l.expenses[0], amount: 5999.99 }];
    expect(budgetView(l, '2026-10').lines[0]).toMatchObject({
      percent: 99,
      status: 'near',
    });
  });
});
