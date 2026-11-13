import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
} from 'class-validator';
import { ACCOUNT_TYPES, type AccountType } from './ledger.types';
import { FREQUENCIES, type Frequency } from './schedule';

const money = { maxDecimalPlaces: 2, allowNaN: false, allowInfinity: false };
const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export const DATE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
export const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

export class CreateExpenseDto {
  @IsNumber(money, { message: 'Amount must have at most 2 decimals' })
  @IsPositive({ message: 'Amount must be more than ৳0' })
  @Max(10_000_000, { message: 'Amount is too large' })
  amount: number;

  @IsUUID('4', { message: 'Pick a category' })
  categoryId: string;

  @IsUUID('4', { message: 'Pick a wallet' })
  accountId: string;

  @Matches(DATE, { message: 'Date must be YYYY-MM-DD' })
  expenseDate: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(120)
  description?: string;
}

export class UpdateExpenseDto {
  @IsOptional()
  @IsNumber(money, { message: 'Amount must have at most 2 decimals' })
  @IsPositive({ message: 'Amount must be more than ৳0' })
  @Max(10_000_000, { message: 'Amount is too large' })
  amount?: number;

  @IsOptional()
  @IsUUID('4', { message: 'Pick a category' })
  categoryId?: string;

  @IsOptional()
  @IsUUID('4', { message: 'Pick a wallet' })
  accountId?: string;

  @IsOptional()
  @Matches(DATE, { message: 'Date must be YYYY-MM-DD' })
  expenseDate?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(120)
  description?: string;
}

export class ListExpensesQuery {
  @IsOptional()
  @Matches(MONTH, { message: 'month must be YYYY-MM' })
  month?: string;

  @IsOptional()
  @IsUUID('4')
  categoryId?: string;

  @IsOptional()
  @IsUUID('4')
  accountId?: string;
}

export class MonthQuery {
  @Matches(MONTH, { message: 'month must be YYYY-MM' })
  month: string;
}

export class SampleDataDto {
  @Matches(DATE, { message: 'today must be YYYY-MM-DD' })
  today: string;
}

export class CreateWalletDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Name the wallet' })
  @MaxLength(40)
  name: string;

  @IsIn(ACCOUNT_TYPES, { message: 'Pick a wallet type' })
  type: AccountType;
}

export class SetBudgetDto {
  @Matches(MONTH, { message: 'month must be YYYY-MM' })
  month: string;

  @IsUUID('4', { message: 'Pick a category' })
  categoryId: string;

  @IsNumber(money, { message: 'Amount must have at most 2 decimals' })
  @IsPositive({ message: 'Budget must be more than ৳0' })
  @Max(10_000_000, { message: 'Amount is too large' })
  plannedAmount: number;
}

export class CopyBudgetsDto {
  @Matches(MONTH, { message: 'from must be YYYY-MM' })
  from: string;

  @Matches(MONTH, { message: 'to must be YYYY-MM' })
  to: string;
}

export class TodayQuery {
  /** The client's local date, so "due" matches the user's calendar. */
  @IsOptional()
  @Matches(DATE, { message: 'today must be YYYY-MM-DD' })
  today?: string;
}

export class CreateRecurringDto {
  @IsNumber(money, { message: 'Amount must have at most 2 decimals' })
  @IsPositive({ message: 'Amount must be more than ৳0' })
  @Max(10_000_000, { message: 'Amount is too large' })
  amount: number;

  @IsUUID('4', { message: 'Pick a category' })
  categoryId: string;

  @IsUUID('4', { message: 'Pick a wallet' })
  accountId: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Name this recurring expense, e.g. Internet bill' })
  @MaxLength(120)
  description: string;

  @IsIn(FREQUENCIES, { message: 'Pick how often it repeats' })
  frequency: Frequency;

  @Matches(DATE, { message: 'First due date must be YYYY-MM-DD' })
  startDate: string;
}

export class UpdateRecurringDto {
  @IsOptional()
  @IsNumber(money, { message: 'Amount must have at most 2 decimals' })
  @IsPositive({ message: 'Amount must be more than ৳0' })
  @Max(10_000_000, { message: 'Amount is too large' })
  amount?: number;

  @IsOptional()
  @IsUUID('4', { message: 'Pick a category' })
  categoryId?: string;

  @IsOptional()
  @IsUUID('4', { message: 'Pick a wallet' })
  accountId?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Name this recurring expense, e.g. Internet bill' })
  @MaxLength(120)
  description?: string;

  @IsOptional()
  @IsIn(FREQUENCIES, { message: 'Pick how often it repeats' })
  frequency?: Frequency;

  /** Moving the next due date also re-anchors the schedule there. */
  @IsOptional()
  @Matches(DATE, { message: 'Next due date must be YYYY-MM-DD' })
  nextDueDate?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

/** The reviewed expense (PRD §6.7: fields editable before confirming). */
export class ConfirmRecurringDto {
  @IsOptional()
  @IsNumber(money, { message: 'Amount must have at most 2 decimals' })
  @IsPositive({ message: 'Amount must be more than ৳0' })
  @Max(10_000_000, { message: 'Amount is too large' })
  amount?: number;

  @IsOptional()
  @IsUUID('4', { message: 'Pick a category' })
  categoryId?: string;

  @IsOptional()
  @IsUUID('4', { message: 'Pick a wallet' })
  accountId?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(120)
  description?: string;

  @Matches(DATE, { message: 'Date must be YYYY-MM-DD' })
  expenseDate: string;

  @Matches(DATE, { message: 'today must be YYYY-MM-DD' })
  today: string;
}
