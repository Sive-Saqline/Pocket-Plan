import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  ValidateNested,
} from 'class-validator';

// Amounts are in taka (৳) with at most two decimal places.
const money = { maxDecimalPlaces: 2, allowNaN: false, allowInfinity: false };

export class MemberDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsNotEmpty()
  name: string;
}

export class ExpenseDto {
  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber(money)
  @IsPositive()
  amount: number;

  @IsString()
  paidBy: string;

  /** Omit to split equally among all members (§9.1 default). */
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  participants?: string[];
}

export class SettlementDto {
  @IsString()
  from: string;

  @IsString()
  to: string;

  @IsNumber(money)
  @IsPositive()
  amount: number;
}

export class BalancePreviewDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => MemberDto)
  members: MemberDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExpenseDto)
  expenses: ExpenseDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SettlementDto)
  settlements?: SettlementDto[];
}
