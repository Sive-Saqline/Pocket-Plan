import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ValidateIf,
  IsArray,
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
  Min,
} from 'class-validator';
import {
  ACCOUNT_TYPES,
  CATEGORY_ICONS,
  type AccountType,
  type CategoryIcon,
} from './ledger.types';
import { FREQUENCIES, type Frequency } from './schedule';

const money = { maxDecimalPlaces: 2, allowNaN: false, allowInfinity: false };
const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
/** "a, b,,c" -> ["a", "b", "c"]; anything else is left for validation to refuse. */
const commaList = ({ value }: { value: unknown }) =>
  typeof value === 'string'
    ? value
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : value;

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

/** GET /reports?from=YYYY-MM&to=YYYY-MM[&group_id=<uuid>] */
/**
 * A range of whole months (from, to: YYYY-MM) or of any days (start, end:
 * YYYY-MM-DD, at most a year). One pair or the other.
 */
export class ReportQuery {
  @ValidateIf((q: ReportQuery) => q.start === undefined || q.from !== undefined)
  @Matches(MONTH, { message: 'from must be YYYY-MM' })
  from?: string;

  @ValidateIf((q: ReportQuery) => q.start === undefined || q.to !== undefined)
  @Matches(MONTH, { message: 'to must be YYYY-MM' })
  to?: string;

  @ValidateIf((q: ReportQuery) => q.from === undefined || q.start !== undefined)
  @Matches(DATE, { message: 'start must be YYYY-MM-DD' })
  start?: string;

  @ValidateIf((q: ReportQuery) => q.from === undefined || q.end !== undefined)
  @Matches(DATE, { message: 'end must be YYYY-MM-DD' })
  end?: string;

  /** Report on one group I belong to instead of my personal spending. */
  @IsOptional()
  @IsUUID('4', { message: 'group_id must be a group id' })
  group_id?: string;

  /**
   * Comma-separated. Personal: category ids. Group: category keys (food,
   * transport, ...). Unknown ones are ignored.
   */
  @IsOptional()
  @Transform(commaList)
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  categories?: string[];

  /** Comma-separated wallet ids (personal reports only). */
  @IsOptional()
  @Transform(commaList)
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  wallets?: string[];
}

// A wallet's balance is typed in by the user and is informational only
// (PRD Decision 6). It may be negative, e.g. a credit card.
const BALANCE_LIMIT = 1_000_000_000;

export class CreateWalletDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Name the wallet' })
  @MaxLength(40, { message: 'Wallet name must be at most 40 characters' })
  name: string;

  @IsIn(ACCOUNT_TYPES, { message: 'Pick a wallet type' })
  type: AccountType;

  @IsOptional()
  @IsNumber(money, { message: 'Balance must have at most 2 decimals' })
  @Min(-BALANCE_LIMIT, { message: 'Balance is too large' })
  @Max(BALANCE_LIMIT, { message: 'Balance is too large' })
  balance?: number;
}

export class UpdateWalletDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Name the wallet' })
  @MaxLength(40, { message: 'Wallet name must be at most 40 characters' })
  name?: string;

  @IsOptional()
  @IsIn(ACCOUNT_TYPES, { message: 'Pick a wallet type' })
  type?: AccountType;

  @IsOptional()
  @IsNumber(money, { message: 'Balance must have at most 2 decimals' })
  @Min(-BALANCE_LIMIT, { message: 'Balance is too large' })
  @Max(BALANCE_LIMIT, { message: 'Balance is too large' })
  balance?: number;
}

export class CreateCategoryDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Name the category' })
  @MaxLength(30, { message: 'Category name must be at most 30 characters' })
  name: string;

  @IsIn(CATEGORY_ICONS, { message: 'Pick an icon' })
  icon: CategoryIcon;
}

export class DeleteCategoryQuery {
  @IsOptional()
  @IsUUID('4', { message: 'Pick a category to move them to' })
  moveTo?: string;
}

export class UpdateCategoryDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Name the category' })
  @MaxLength(30, { message: 'Category name must be at most 30 characters' })
  name?: string;

  @IsOptional()
  @IsIn(CATEGORY_ICONS, { message: 'Pick an icon' })
  icon?: CategoryIcon;
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

export class SetSavingsGoalDto {
  @Matches(MONTH, { message: 'month must be YYYY-MM' })
  month: string;

  @IsNumber(money, { message: 'Amount must have at most 2 decimals' })
  @IsPositive({ message: 'Target must be more than ৳0' })
  @Max(10_000_000, { message: 'Amount is too large' })
  targetAmount: number;
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
