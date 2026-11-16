import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { budgetView } from './budgets';
import { savingsView } from './savings';
import {
  CopyBudgetsDto,
  CreateCategoryDto,
  CreateExpenseDto,
  CreateWalletDto,
  ListExpensesQuery,
  SetBudgetDto,
  SetSavingsGoalDto,
  UpdateCategoryDto,
  UpdateExpenseDto,
  UpdateWalletDto,
} from './ledger.dto';
import { LedgerStore } from './ledger.store';
import { Category, Expense, SAVINGS_KEY, UserLedger } from './ledger.types';

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

  /** The user's categories, each with how often it's used (to spot ones worth removing). */
  async categories(userId: string) {
    const { categories, expenses, recurring } = await this.store.read(userId);
    const count = (items: { categoryId: string }[], id: string) =>
      items.reduce((n, x) => n + (x.categoryId === id ? 1 : 0), 0);
    return categories.map((c) => ({
      ...c,
      expenseCount: count(expenses, c.id),
      recurringCount: count(recurring, c.id),
    }));
  }

  async wallets(userId: string) {
    return (await this.store.read(userId)).accounts;
  }

  createWallet(userId: string, { name, type, balance }: CreateWalletDto) {
    return this.store.mutate(userId, (ledger) => {
      assertUniqueName(ledger.accounts, name, 'a wallet');
      const now = new Date().toISOString();
      const wallet = {
        id: randomUUID(),
        name,
        type,
        balance: balance ?? 0,
        createdAt: now,
        updatedAt: now,
      };
      ledger.accounts.push(wallet);
      return wallet;
    });
  }

  updateWallet(userId: string, id: string, dto: UpdateWalletDto) {
    return this.store.mutate(userId, (ledger) => {
      const wallet = ledger.accounts.find((a) => a.id === id);
      if (!wallet) throw new NotFoundException('Wallet not found');
      if (dto.name !== undefined) {
        assertUniqueName(ledger.accounts, dto.name, 'a wallet', id);
      }
      Object.assign(wallet, stripUndefined(dto), {
        updatedAt: new Date().toISOString(),
      });
      return wallet;
    });
  }

  /** Refused while expenses or recurring expenses use it; never deletes them. */
  deleteWallet(userId: string, id: string) {
    return this.store.mutate(userId, (ledger) => {
      const wallet = ledger.accounts.find((a) => a.id === id);
      if (!wallet) throw new NotFoundException('Wallet not found');
      assertUnused(ledger, wallet.name, (x) => x.accountId === id);
      if (ledger.accounts.length === 1) {
        throw new ConflictException(
          'You need at least one wallet. Add another before deleting this one.',
        );
      }
      ledger.accounts = ledger.accounts.filter((a) => a.id !== id);
    });
  }

  createCategory(userId: string, { name, icon }: CreateCategoryDto) {
    return this.store.mutate(userId, (ledger) => {
      assertUniqueName(ledger.categories, name, 'a category');
      const category: Category = {
        id: randomUUID(),
        name,
        icon,
        systemKey: null,
        createdAt: new Date().toISOString(),
      };
      ledger.categories.push(category);
      return category;
    });
  }

  updateCategory(userId: string, id: string, dto: UpdateCategoryDto) {
    return this.store.mutate(userId, (ledger) => {
      const category = ledger.categories.find((c) => c.id === id);
      if (!category) throw new NotFoundException('Category not found');
      if (dto.name !== undefined) {
        assertUniqueName(ledger.categories, dto.name, 'a category', id);
      }
      Object.assign(category, stripUndefined(dto));
      return category;
    });
  }

  /**
   * Deletes one of this user's categories (never anyone else's).
   * - Unused: just deleted.
   * - In use: `moveTo` names another of the user's categories; its expenses
   *   and recurring expenses move there first, in the same transaction, so
   *   nothing is lost. Without `moveTo` it's refused and says how many use it.
   * Its budgets go with it: a budget for a category that no longer exists
   * means nothing.
   */
  deleteCategory(userId: string, id: string, moveTo?: string) {
    return this.store.mutate(userId, (ledger) => {
      const category = ledger.categories.find((c) => c.id === id);
      if (!category) throw new NotFoundException('Category not found');
      if (category.systemKey === SAVINGS_KEY) {
        throw new ConflictException(
          `${category.name} tracks your savings goal, so it can't be deleted. You can rename it.`,
        );
      }
      if (ledger.categories.length === 1) {
        throw new ConflictException(
          'You need at least one category. Add another before deleting this one.',
        );
      }
      const uses = (x: { categoryId: string }) => x.categoryId === id;
      const inUse = ledger.expenses.some(uses) || ledger.recurring.some(uses);
      if (inUse) {
        if (!moveTo) {
          assertUnused(
            ledger,
            category.name,
            uses,
            (it) => `Choose a category to move ${it} to.`,
          );
        } else {
          if (moveTo === id) {
            throw new BadRequestException(
              'Pick a different category to move them to',
            );
          }
          if (!ledger.categories.some((c) => c.id === moveTo)) {
            throw new BadRequestException('Unknown category to move them to');
          }
          const now = new Date().toISOString();
          for (const item of [...ledger.expenses, ...ledger.recurring]) {
            if (item.categoryId === id) {
              item.categoryId = moveTo;
              item.updatedAt = now;
            }
          }
        }
      }
      ledger.categories = ledger.categories.filter((c) => c.id !== id);
      ledger.budgets = ledger.budgets.filter((b) => b.categoryId !== id);
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

  async savingsGoal(userId: string, month: string) {
    return savingsView(await this.store.read(userId), month);
  }

  /** Creates or replaces the savings target for one month. */
  setSavingsGoal(userId: string, { month, targetAmount }: SetSavingsGoalDto) {
    return this.store.mutate(userId, (ledger) => {
      const now = new Date().toISOString();
      const existing = ledger.savings.find((g) => g.month === month);
      if (existing) {
        Object.assign(existing, { targetAmount, updatedAt: now });
      } else {
        ledger.savings.push({
          id: randomUUID(),
          month,
          targetAmount,
          createdAt: now,
          updatedAt: now,
        });
      }
      return savingsView(ledger, month);
    });
  }

  deleteSavingsGoal(userId: string, month: string) {
    return this.store.mutate(userId, (ledger) => {
      const before = ledger.savings.length;
      ledger.savings = ledger.savings.filter((g) => g.month !== month);
      if (ledger.savings.length === before) {
        throw new NotFoundException('No savings target for that month');
      }
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
      savings: savingsView(ledger, month),
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

/** Names are unique per user, ignoring case ("bKash" = "BKASH"). */
function assertUniqueName(
  items: { id: string; name: string }[],
  name: string,
  what: string,
  exceptId?: string,
) {
  const clash = items.find(
    (x) => x.id !== exceptId && x.name.toLowerCase() === name.toLowerCase(),
  );
  if (clash) {
    throw new ConflictException(
      `You already have ${what} called ${clash.name}`,
    );
  }
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** Blocks deleting a wallet or category that expenses or recurring expenses still use. */
function assertUnused(
  ledger: UserLedger,
  name: string,
  uses: (x: { accountId: string; categoryId: string }) => boolean,
  /** What to do about it; `it` is "it" or "them". */
  advice = (it: string) => `Move or delete ${it} first.`,
) {
  const expenses = ledger.expenses.filter(uses).length;
  const recurring = ledger.recurring.filter(uses).length;
  if (expenses + recurring === 0) return;
  const parts = [
    expenses && plural(expenses, 'expense'),
    recurring && plural(recurring, 'recurring expense'),
  ].filter(Boolean);
  throw new ConflictException(
    `${name} is used by ${parts.join(' and ')}. ${advice(
      expenses + recurring === 1 ? 'it' : 'them',
    )}`,
  );
}

export function stripUndefined<T extends object>(value: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, v]) => v !== undefined),
  ) as Partial<T>;
}
