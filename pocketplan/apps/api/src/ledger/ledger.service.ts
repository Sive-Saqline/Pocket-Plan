import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { budgetView } from './budgets';
import { addSampleData } from './defaults';
import {
  CopyBudgetsDto,
  CreateExpenseDto,
  CreateWalletDto,
  ListExpensesQuery,
  SetBudgetDto,
  UpdateExpenseDto,
} from './ledger.dto';
import { LedgerStore } from './ledger.store';
import { Expense, UserLedger } from './ledger.types';

// Sums in integer paisa so ৳0.1 + ৳0.2 is exactly ৳0.3.
const sum = (amounts: number[]) =>
  amounts.reduce((total, a) => total + Math.round(a * 100), 0) / 100;

const newestFirst = (a: Expense, b: Expense) =>
  b.expenseDate.localeCompare(a.expenseDate) ||
  b.createdAt.localeCompare(a.createdAt);

function previousMonth(month: string) {
  const [y, m] = month.split('-').map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
}

@Injectable()
export class LedgerService {
  constructor(private readonly store: LedgerStore) {}

  async categories(userId: string) {
    return (await this.store.read(userId)).categories;
  }

  async wallets(userId: string) {
    return (await this.store.read(userId)).accounts;
  }

  createWallet(userId: string, { name, type }: CreateWalletDto) {
    return this.store.mutate(userId, (ledger) => {
      if (
        ledger.accounts.some((a) => a.name.toLowerCase() === name.toLowerCase())
      ) {
        throw new ConflictException(`You already have a wallet called ${name}`);
      }
      const now = new Date().toISOString();
      const wallet = {
        id: randomUUID(),
        name,
        type,
        balance: 0,
        createdAt: now,
        updatedAt: now,
      };
      ledger.accounts.push(wallet);
      return wallet;
    });
  }

  async expenses(userId: string, query: ListExpensesQuery) {
    const { expenses } = await this.store.read(userId);
    return expenses
      .filter(
        (e) =>
          (!query.month || e.expenseDate.startsWith(query.month)) &&
          (!query.categoryId || e.categoryId === query.categoryId) &&
          (!query.accountId || e.accountId === query.accountId),
      )
      .sort(newestFirst);
  }

  createExpense(userId: string, dto: CreateExpenseDto) {
    return this.store.mutate(userId, (ledger) => {
      assertRefs(ledger, dto);
      const now = new Date().toISOString();
      const expense: Expense = {
        id: randomUUID(),
        amount: dto.amount,
        categoryId: dto.categoryId,
        accountId: dto.accountId,
        expenseDate: dto.expenseDate,
        description: dto.description ?? '',
        createdAt: now,
        updatedAt: now,
      };
      ledger.expenses.push(expense);
      return expense;
    });
  }

  updateExpense(userId: string, id: string, dto: UpdateExpenseDto) {
    return this.store.mutate(userId, (ledger) => {
      const expense = findExpense(ledger, id);
      assertRefs(ledger, dto);
      Object.assign(expense, stripUndefined(dto), {
        updatedAt: new Date().toISOString(),
      });
      return expense;
    });
  }

  deleteExpense(userId: string, id: string) {
    return this.store.mutate(userId, (ledger) => {
      findExpense(ledger, id);
      ledger.expenses = ledger.expenses.filter((e) => e.id !== id);
    });
  }

  addSampleData(userId: string, today: string) {
    return this.store.mutate(userId, (ledger) => {
      if (ledger.expenses.length > 0) {
        throw new ConflictException(
          'Sample data can only be added to an empty account',
        );
      }
      return { added: addSampleData(ledger, today) };
    });
  }

  async budgets(userId: string, month: string) {
    return budgetView(await this.store.read(userId), month);
  }

  /** Creates or replaces the plan for one category in one month (unique per user/category/month). */
  setBudget(
    userId: string,
    { month, categoryId, plannedAmount }: SetBudgetDto,
  ) {
    return this.store.mutate(userId, (ledger) => {
      assertRefs(ledger, { categoryId });
      const now = new Date().toISOString();
      const existing = ledger.budgets.find(
        (b) => b.month === month && b.categoryId === categoryId,
      );
      if (existing) {
        Object.assign(existing, { plannedAmount, updatedAt: now });
        return existing;
      }
      const budget = {
        id: randomUUID(),
        month,
        categoryId,
        plannedAmount,
        createdAt: now,
        updatedAt: now,
      };
      ledger.budgets.push(budget);
      return budget;
    });
  }

  deleteBudget(userId: string, month: string, categoryId: string) {
    return this.store.mutate(userId, (ledger) => {
      const before = ledger.budgets.length;
      ledger.budgets = ledger.budgets.filter(
        (b) => !(b.month === month && b.categoryId === categoryId),
      );
      if (ledger.budgets.length === before) {
        throw new NotFoundException('No budget for that category this month');
      }
    });
  }

  /** Copies plans from one month into another, never overwriting plans already set there. */
  copyBudgets(userId: string, { from, to }: CopyBudgetsDto) {
    if (from === to) throw new BadRequestException('Pick two different months');
    return this.store.mutate(userId, (ledger) => {
      const now = new Date().toISOString();
      const taken = new Set(
        ledger.budgets.filter((b) => b.month === to).map((b) => b.categoryId),
      );
      const source = ledger.budgets.filter((b) => b.month === from);
      const copies = source
        .filter((b) => !taken.has(b.categoryId))
        .map((b) => ({
          id: randomUUID(),
          month: to,
          categoryId: b.categoryId,
          plannedAmount: b.plannedAmount,
          createdAt: now,
          updatedAt: now,
        }));
      ledger.budgets.push(...copies);
      return { copied: copies.length, skipped: source.length - copies.length };
    });
  }

  /** Dashboard numbers for one month (YYYY-MM). */
  async summary(userId: string, month: string) {
    const ledger = await this.store.read(userId);
    const { expenses, categories, accounts } = ledger;
    const budget = budgetView(ledger, month);
    const inMonth = expenses.filter((e) => e.expenseDate.startsWith(month));
    const total = sum(inMonth.map((e) => e.amount));
    const previous = previousMonth(month);

    const byCategory = categories
      .map((c) => {
        const spent = sum(
          inMonth.filter((e) => e.categoryId === c.id).map((e) => e.amount),
        );
        return {
          categoryId: c.id,
          name: c.name,
          icon: c.icon,
          total: spent,
          share: total ? Math.round((spent / total) * 1000) / 10 : 0,
        };
      })
      .filter((c) => c.total > 0)
      .sort((a, b) => b.total - a.total);

    const byWallet = accounts
      .map((a) => ({
        accountId: a.id,
        name: a.name,
        type: a.type,
        total: sum(
          inMonth.filter((e) => e.accountId === a.id).map((e) => e.amount),
        ),
      }))
      .sort((a, b) => b.total - a.total);

    return {
      month,
      total,
      count: inMonth.length,
      previousMonth: previous,
      previousTotal: sum(
        expenses
          .filter((e) => e.expenseDate.startsWith(previous))
          .map((e) => e.amount),
      ),
      byCategory,
      byWallet,
      recent: [...inMonth].sort(newestFirst).slice(0, 5),
      budget: {
        planned: budget.planned,
        spentOnBudgeted: budget.spentOnBudgeted,
        lines: budget.lines.filter((l) => l.planned !== null),
      },
    };
  }
}

function findExpense(ledger: UserLedger, id: string) {
  const expense = ledger.expenses.find((e) => e.id === id);
  // Same answer for "missing" and "someone else's": nothing leaks across users.
  if (!expense) throw new NotFoundException('Expense not found');
  return expense;
}

export function assertRefs(
  ledger: UserLedger,
  { categoryId, accountId }: { categoryId?: string; accountId?: string },
) {
  if (categoryId && !ledger.categories.some((c) => c.id === categoryId)) {
    throw new BadRequestException('Unknown category');
  }
  if (accountId && !ledger.accounts.some((a) => a.id === accountId)) {
    throw new BadRequestException('Unknown wallet');
  }
}

export function stripUndefined<T extends object>(value: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, v]) => v !== undefined),
  ) as Partial<T>;
}
