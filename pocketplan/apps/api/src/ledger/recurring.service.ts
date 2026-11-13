import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { isoDate } from './defaults';
import {
  ConfirmRecurringDto,
  CreateRecurringDto,
  UpdateRecurringDto,
} from './ledger.dto';
import { assertRefs, stripUndefined } from './ledger.service';
import { LedgerStore } from './ledger.store';
import { Expense, RecurringExpense, UserLedger } from './ledger.types';
import { dueCount, nextOccurrence } from './schedule';

export interface RecurringView extends RecurringExpense {
  /** Active and next due date ≤ today (PRD §6.7; computed, never stored). */
  due: boolean;
  /** Occurrences waiting, counting missed ones; 0 when not due. */
  dueCount: number;
}

const view = (r: RecurringExpense, today: string): RecurringView => {
  const count = r.isActive
    ? dueCount(r.startDate, r.frequency, r.nextDueDate, today)
    : 0;
  return { ...r, due: count > 0, dueCount: count };
};

/** Due first (oldest first), then upcoming by date, then paused. */
const order = (a: RecurringView, b: RecurringView) =>
  Number(b.due) - Number(a.due) ||
  Number(b.isActive) - Number(a.isActive) ||
  a.nextDueDate.localeCompare(b.nextDueDate) ||
  a.description.localeCompare(b.description);

@Injectable()
export class RecurringService {
  constructor(private readonly store: LedgerStore) {}

  async list(userId: string, today = isoDate(new Date())) {
    const { recurring } = await this.store.read(userId);
    return recurring.map((r) => view(r, today)).sort(order);
  }

  create(userId: string, dto: CreateRecurringDto, today = isoDate(new Date())) {
    return this.store.mutate(userId, (ledger) => {
      assertRefs(ledger, dto);
      const now = new Date().toISOString();
      const recurring: RecurringExpense = {
        id: randomUUID(),
        ...dto,
        nextDueDate: dto.startDate,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      };
      ledger.recurring.push(recurring);
      return view(recurring, today);
    });
  }

  update(
    userId: string,
    id: string,
    dto: UpdateRecurringDto,
    today = isoDate(new Date()),
  ) {
    return this.store.mutate(userId, (ledger) => {
      const recurring = find(ledger, id);
      assertRefs(ledger, dto);
      const { nextDueDate, frequency, ...rest } = stripUndefined(dto);
      Object.assign(recurring, rest);
      // A new frequency or due date starts the schedule afresh from that date.
      if (nextDueDate !== undefined || frequency !== undefined) {
        recurring.frequency = frequency ?? recurring.frequency;
        recurring.nextDueDate = nextDueDate ?? recurring.nextDueDate;
        recurring.startDate = recurring.nextDueDate;
      }
      recurring.updatedAt = new Date().toISOString();
      return view(recurring, today);
    });
  }

  remove(userId: string, id: string) {
    return this.store.mutate(userId, (ledger) => {
      find(ledger, id);
      ledger.recurring = ledger.recurring.filter((r) => r.id !== id);
    });
  }

  /**
   * Creates the expense from the reviewed template and advances its next due
   * date by one occurrence, in a single atomic write (PRD §8 transactions).
   */
  confirm(userId: string, id: string, dto: ConfirmRecurringDto) {
    return this.store.mutate(userId, (ledger) => {
      const recurring = find(ledger, id);
      if (!recurring.isActive) {
        throw new ConflictException('This recurring expense is paused');
      }
      if (recurring.nextDueDate > dto.today) {
        // also stops a double tap from saving the same bill twice
        throw new ConflictException('This recurring expense is not due yet');
      }
      const { today, ...overrides } = dto;
      assertRefs(ledger, overrides);

      const now = new Date().toISOString();
      const expense: Expense = {
        id: randomUUID(),
        amount: overrides.amount ?? recurring.amount,
        categoryId: overrides.categoryId ?? recurring.categoryId,
        accountId: overrides.accountId ?? recurring.accountId,
        description: overrides.description ?? recurring.description,
        expenseDate: overrides.expenseDate,
        createdAt: now,
        updatedAt: now,
      };
      ledger.expenses.push(expense);
      recurring.nextDueDate = nextOccurrence(
        recurring.startDate,
        recurring.frequency,
        recurring.nextDueDate,
      );
      recurring.updatedAt = now;
      return { expense, recurring: view(recurring, today) };
    });
  }
}

function find(ledger: UserLedger, id: string) {
  const recurring = ledger.recurring.find((r) => r.id === id);
  if (!recurring) throw new NotFoundException('Recurring expense not found');
  return recurring;
}
