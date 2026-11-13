import type { Frequency } from './schedule';

export const ACCOUNT_TYPES = [
  'CASH',
  'BANK',
  'CARD',
  'MOBILE_WALLET',
  'OTHER',
] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

export interface Category {
  id: string;
  name: string;
  /** Icon key, e.g. "food". Accounts created before Step 10 may hold an emoji. */
  icon: string;
  createdAt: string;
}

/** A wallet (PRD "Accounts/Wallets"); balance is user-maintained, informational. */
export interface Wallet {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  createdAt: string;
  updatedAt: string;
}

export interface Expense {
  id: string;
  accountId: string;
  categoryId: string;
  /** Taka with at most two decimals. */
  amount: number;
  description: string;
  /** Local calendar date, YYYY-MM-DD. */
  expenseDate: string;
  createdAt: string;
  updatedAt: string;
}

/** Planned spend for one category in one month (PRD §6.5). */
export interface Budget {
  id: string;
  categoryId: string;
  /** YYYY-MM */
  month: string;
  plannedAmount: number;
  createdAt: string;
  updatedAt: string;
}

/** A repeating expense the user confirms when due (PRD §6.7 reminder model). */
export interface RecurringExpense {
  id: string;
  accountId: string;
  categoryId: string;
  amount: number;
  description: string;
  frequency: Frequency;
  /** First occurrence; later ones are computed from it (YYYY-MM-DD). */
  startDate: string;
  /** Next occurrence awaiting confirmation; due when ≤ today. */
  nextDueDate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Everything one user owns. Never shared across users (PRD §12). */
export interface UserLedger {
  categories: Category[];
  accounts: Wallet[];
  expenses: Expense[];
  budgets: Budget[];
  recurring: RecurringExpense[];
}
