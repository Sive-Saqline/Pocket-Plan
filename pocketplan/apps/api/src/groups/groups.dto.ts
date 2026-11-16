import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEmail,
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
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { SPLIT_TYPES, type SplitType } from '../balances/split';
import { DATE, MONTH } from '../ledger/ledger.dto';
import { CATEGORY_ICONS, type CategoryIcon } from '../ledger/ledger.types';
import type { GroupRole } from './membership';

const ROLES = ['OWNER', 'MEMBER'] as const;
const money = { maxDecimalPlaces: 2, allowNaN: false, allowInfinity: false };
const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateGroupDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Name the group' })
  @MaxLength(40, { message: 'Group name must be at most 40 characters' })
  name: string;
}

export class UpdateGroupDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Name the group' })
  @MaxLength(40, { message: 'Group name must be at most 40 characters' })
  name?: string;

  /** null removes the budget */
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsNumber(money, { message: 'Budget must have at most 2 decimals' })
  @IsPositive({ message: 'Budget must be more than ৳0' })
  @Max(100_000_000, { message: 'Budget is too large' })
  monthlyBudget?: number | null;
}

export class ChangeRoleDto {
  @IsIn(ROLES, { message: 'Pick a role' })
  role: GroupRole;
}

export class CreateInviteDto {
  /** Leave out for a shareable link. */
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail({}, { message: 'Enter a valid email address' })
  @MaxLength(254)
  email?: string;

  @IsOptional()
  @IsIn(ROLES, { message: 'Pick a role' })
  role?: GroupRole;
}

export class SplitParticipantDto {
  @IsUUID('4', { message: 'Pick who is in the split' })
  userId: string;

  @IsOptional()
  @IsNumber(money, { message: 'Split values can have at most 2 decimals' })
  @IsPositive({ message: 'Split values must be more than 0' })
  @Max(10_000_000, { message: 'Split value is too large' })
  value?: number;
}

/** Create, or replace on edit (every field is sent each time). */
export class GroupExpenseDto {
  @IsNumber(money, { message: 'Amount must have at most 2 decimals' })
  @IsPositive({ message: 'Amount must be more than ৳0' })
  @Max(10_000_000, { message: 'Amount is too large' })
  amount: number;

  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Add a short description' })
  @MaxLength(120)
  description: string;

  @Matches(DATE, { message: 'Date must be YYYY-MM-DD' })
  expenseDate: string;

  @IsIn(CATEGORY_ICONS, { message: 'Pick a category' })
  category: CategoryIcon;

  @IsUUID('4', { message: 'Pick who paid' })
  paidBy: string;

  @IsIn(SPLIT_TYPES, { message: 'Pick how to split it' })
  splitType: SplitType;

  @IsArray()
  @ArrayMinSize(1, { message: 'Pick at least one person to split with' })
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => SplitParticipantDto)
  participants: SplitParticipantDto[];
}

export class SettlementDto {
  @IsUUID('4', { message: 'Pick who paid' })
  fromUserId: string;

  @IsUUID('4', { message: 'Pick who was paid' })
  toUserId: string;

  @IsNumber(money, { message: 'Amount must have at most 2 decimals' })
  @IsPositive({ message: 'Amount must be more than ৳0' })
  @Max(10_000_000, { message: 'Amount is too large' })
  amount: number;
}

export class OptionalMonthQuery {
  @IsOptional()
  @Matches(MONTH, { message: 'month must be YYYY-MM' })
  month?: string;
}

export class RequiredMonthQuery {
  @Matches(MONTH, { message: 'month must be YYYY-MM' })
  month: string;
}
