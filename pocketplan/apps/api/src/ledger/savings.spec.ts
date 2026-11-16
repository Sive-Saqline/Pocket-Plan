import { UserLedger } from './ledger.types';
import { savingsView } from './savings';

const at = '2026-10-01T00:00:00.000Z';
const expense = (
  id: string,
  categoryId: string,
  amount: number,
  expenseDate: string,
) => ({
  id,
  accountId: 'cash',
  categoryId,
  amount,
  description: '',
  expenseDate,
  createdAt: at,
  updatedAt: at,
});

const ledger = (): UserLedger => ({
  categories: [
    { id: 'food', name: 'Food', icon: 'food', systemKey: null, createdAt: at },
    {
      id: 'sav',
      name: 'Savings',
      icon: 'savings',
      systemKey: 'savings',
      createdAt: at,
    },
  ],
  accounts: [],
  expenses: [
    expense('e1', 'sav', 2000, '2026-10-01'), // first day of the month
    expense('e2', 'sav', 0.1, '2026-10-15'),
    expense('e3', 'sav', 0.2, '2026-10-31'), // last day of the month
    expense('e4', 'sav', 5000, '2026-09-30'), // previous month
    expense('e5', 'sav', 7000, '2026-11-01'), // next month
    expense('e6', 'food', 900, '2026-10-10'), // not savings
  ],
  budgets: [],
  recurring: [],
  savings: [
    {
      id: 'g1',
      month: '2026-10',
      targetAmount: 5000,
      createdAt: at,
      updatedAt: at,
    },
  ],
});

describe('savingsView', () => {
  it("adds up only this month's Savings expenses, exactly", () => {
    const v = savingsView(ledger(), '2026-10');
    expect(v).toEqual({
      month: '2026-10',
      target: 5000,
      saved: 2000.3, // 0.1 + 0.2 stays exact
      remaining: 2999.7,
      percent: 40,
      status: 'saving',
      category: { id: 'sav', name: 'Savings', icon: 'savings' },
    });
  });

  it('shows what was saved even without a target', () => {
    const v = savingsView(ledger(), '2026-09');
    expect(v).toMatchObject({
      target: null,
      saved: 5000,
      remaining: null,
      percent: null,
      status: 'none',
    });
  });

  it('is reached at the target and can go past 100%', () => {
    const l = ledger();
    l.savings[0].targetAmount = 2000.3;
    expect(savingsView(l, '2026-10')).toMatchObject({
      remaining: 0,
      percent: 100,
      status: 'reached',
    });
    l.savings[0].targetAmount = 1000;
    expect(savingsView(l, '2026-10')).toMatchObject({
      remaining: 0,
      percent: 200,
      status: 'reached',
    });
  });

  it('rounds the percent down so 99.9% never reads 100%', () => {
    const l = ledger();
    l.savings[0].targetAmount = 2000.31;
    expect(savingsView(l, '2026-10')).toMatchObject({
      percent: 99,
      status: 'saving',
    });
  });

  it('follows the Savings category through a rename, not its name', () => {
    const l = ledger();
    l.categories[1].name = 'Rainy day fund';
    // A new category called "Savings" doesn't count.
    l.categories.push({
      id: 'other',
      name: 'Savings',
      icon: 'savings',
      systemKey: null,
      createdAt: at,
    });
    l.expenses.push(expense('e7', 'other', 999, '2026-10-05'));
    const v = savingsView(l, '2026-10');
    expect(v.saved).toBe(2000.3);
    expect(v.category).toEqual({
      id: 'sav',
      name: 'Rainy day fund',
      icon: 'savings',
    });
  });

  it('reports nothing saved when there is no Savings category', () => {
    const l = ledger();
    l.categories = l.categories.filter((c) => c.id !== 'sav');
    expect(savingsView(l, '2026-10')).toMatchObject({
      saved: 0,
      percent: 0,
      category: null,
    });
  });
});
