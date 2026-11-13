import { randomUUID } from 'node:crypto';
import { AccountType, UserLedger } from './ledger.types';
import { Frequency, occurrence } from './schedule';

// PRD §6.3 defaults. `icon` is a key the web app maps to an icon
// (apps/web/src/components/ui/icons.tsx); older accounts may still hold emojis.
const DEFAULT_CATEGORIES: [string, string][] = [
  ['Food', 'food'],
  ['Transport', 'transport'],
  ['Bills', 'bills'],
  ['Shopping', 'shopping'],
  ['Health', 'health'],
  ['Education', 'education'],
  ['Entertainment', 'entertainment'],
  ['Savings', 'savings'],
  ['Miscellaneous', 'misc'],
];

export function newLedger(now = new Date().toISOString()): UserLedger {
  return {
    categories: DEFAULT_CATEGORIES.map(([name, icon]) => ({
      id: randomUUID(),
      name,
      icon,
      createdAt: now,
    })),
    accounts: [
      {
        id: randomUUID(),
        name: 'Cash',
        type: 'CASH',
        balance: 0,
        createdAt: now,
        updatedAt: now,
      },
    ],
    expenses: [],
    budgets: [],
    recurring: [],
  };
}

type SampleRow = [
  daysAgo: number,
  category: string,
  wallet: string,
  amount: number,
  description: string,
];

// About two months for a Dhaka professional, so month-on-month comparisons look real.
const SAMPLE: SampleRow[] = [
  [0, 'Food', 'Cash', 120, 'Lunch at canteen'],
  [0, 'Transport', 'bKash', 180, 'Pathao to office'],
  [1, 'Bills', 'City Bank', 1200, 'Internet bill'],
  [1, 'Food', 'bKash', 450, 'Dinner — Kacchi Bhai'],
  [2, 'Shopping', 'City Bank', 3200, 'Weekly shop at Agora'],
  [3, 'Health', 'Cash', 340, 'Pharmacy'],
  [4, 'Transport', 'Cash', 60, 'Rickshaw'],
  [5, 'Entertainment', 'bKash', 350, 'Movie at Star Cineplex'],
  [6, 'Food', 'Cash', 95.5, 'Tea and snacks'],
  [8, 'Education', 'City Bank', 1500, 'Online course'],
  [9, 'Bills', 'bKash', 850, 'Electricity (DESCO)'],
  [11, 'Food', 'City Bank', 2640, 'Grocery — Shwapno'],
  [13, 'Transport', 'bKash', 420, 'Uber to Gulshan'],
  [15, 'Savings', 'City Bank', 5000, 'Monthly savings transfer'],
  [18, 'Shopping', 'Cash', 1250, 'New shirt'],
  [21, 'Food', 'Cash', 180, 'Fuchka'],
  [24, 'Bills', 'bKash', 600, 'Mobile recharge'],
  [27, 'Health', 'City Bank', 1500, 'Doctor visit'],
  [31, 'Food', 'City Bank', 2900, 'Grocery — Meena Bazar'],
  [34, 'Transport', 'bKash', 250, 'Pathao'],
  [38, 'Entertainment', 'bKash', 600, 'Concert ticket'],
  [42, 'Bills', 'City Bank', 1200, 'Internet bill'],
  [33, 'Food', 'Cash', 140, 'Lunch at canteen'],
  [36, 'Shopping', 'City Bank', 2800, 'Weekly shop at Agora'],
  [40, 'Bills', 'bKash', 920, 'Electricity (DESCO)'],
  [44, 'Savings', 'City Bank', 5000, 'Monthly savings transfer'],
  [47, 'Food', 'bKash', 520, 'Dinner — Sultan’s Dine'],
  [50, 'Transport', 'bKash', 380, 'Uber to Dhanmondi'],
  [53, 'Health', 'Cash', 260, 'Pharmacy'],
  [55, 'Bills', 'bKash', 600, 'Mobile recharge'],
];

// Chosen against SAMPLE so this month shows one budget over, one near, the rest under.
const SAMPLE_BUDGETS: [string, number][] = [
  ['Food', 6000],
  ['Transport', 750],
  ['Shopping', 4000],
  ['Bills', 4000],
  ['Entertainment', 1000],
  ['Health', 2000],
];

type SampleRecurring = [
  description: string,
  category: string,
  wallet: string,
  amount: number,
  frequency: Frequency,
  /** next due date relative to today, in days (≤ 0 = already due) */
  dueInDays: number,
  isActive: boolean,
];

// Two due now (so the Home banner shows), two upcoming, one paused.
const SAMPLE_RECURRING: SampleRecurring[] = [
  ['Gym membership', 'Health', 'City Bank', 1500, 'MONTHLY', -2, true],
  ['Mobile internet pack', 'Bills', 'bKash', 499, 'MONTHLY', 0, true],
  ['Netflix', 'Entertainment', 'City Bank', 800, 'MONTHLY', 12, true],
  ['Weekly bazar', 'Food', 'Cash', 2000, 'WEEKLY', 3, true],
  ['Spotify', 'Entertainment', 'bKash', 199, 'MONTHLY', 20, false],
];

const SAMPLE_WALLETS: [string, AccountType][] = [
  ['Cash', 'CASH'],
  ['bKash', 'MOBILE_WALLET'],
  ['City Bank', 'BANK'],
];

export function isoDate(d: Date) {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** Adds the sample wallets and expenses, dated back from `today` (YYYY-MM-DD). */
export function addSampleData(ledger: UserLedger, today: string): number {
  const now = new Date().toISOString();
  const walletIds = new Map(ledger.accounts.map((a) => [a.name, a.id]));
  for (const [name, type] of SAMPLE_WALLETS) {
    if (walletIds.has(name)) continue;
    const id = randomUUID();
    ledger.accounts.push({
      id,
      name,
      type,
      balance: 0,
      createdAt: now,
      updatedAt: now,
    });
    walletIds.set(name, id);
  }

  const categoryIds = new Map(ledger.categories.map((c) => [c.name, c.id]));
  const fallback = categoryIds.get('Miscellaneous') ?? ledger.categories[0].id;
  const [y, m, d] = today.split('-').map(Number);
  for (const [daysAgo, category, wallet, amount, description] of SAMPLE) {
    ledger.expenses.push({
      id: randomUUID(),
      accountId: walletIds.get(wallet)!,
      categoryId: categoryIds.get(category) ?? fallback,
      amount,
      description,
      expenseDate: isoDate(new Date(y, m - 1, d - daysAgo)),
      createdAt: now,
      updatedAt: now,
    });
  }
  for (const month of [today.slice(0, 7), shiftMonth(today.slice(0, 7), -1)]) {
    for (const [category, plannedAmount] of SAMPLE_BUDGETS) {
      const categoryId = categoryIds.get(category);
      if (!categoryId) continue;
      if (
        ledger.budgets.some(
          (b) => b.month === month && b.categoryId === categoryId,
        )
      )
        continue;
      ledger.budgets.push({
        id: randomUUID(),
        categoryId,
        month,
        plannedAmount,
        createdAt: now,
        updatedAt: now,
      });
    }
  }
  for (const [
    description,
    category,
    wallet,
    amount,
    frequency,
    dueInDays,
    isActive,
  ] of SAMPLE_RECURRING) {
    const nextDueDate = isoDate(new Date(y, m - 1, d + dueInDays));
    ledger.recurring.push({
      id: randomUUID(),
      accountId: walletIds.get(wallet)!,
      categoryId: categoryIds.get(category) ?? fallback,
      amount,
      description,
      frequency,
      // started a couple of periods ago, so the history looks lived-in
      startDate: occurrence(nextDueDate, frequency, -2),
      nextDueDate,
      isActive,
      createdAt: now,
      updatedAt: now,
    });
  }
  return SAMPLE.length;
}

export function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split('-').map(Number);
  return isoDate(new Date(y, m - 1 + delta, 1)).slice(0, 7);
}
