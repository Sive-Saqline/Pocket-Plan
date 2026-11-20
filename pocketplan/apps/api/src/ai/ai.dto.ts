import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';
import { DATE } from '../ledger/ledger.dto';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class ParseExpenseDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Type what you spent, e.g. "Rickshaw 120 yesterday"' })
  @MaxLength(300, {
    message: 'Keep it to one expense (300 characters at most)',
  })
  text: string;

  /** The user's local date, so "yesterday" means their yesterday. */
  @IsOptional()
  @Matches(DATE, { message: 'today must be YYYY-MM-DD' })
  today?: string;

  /** Fill a shared expense in this group (I must be a member). */
  @IsOptional()
  @IsUUID('4', { message: 'Unknown group' })
  groupId?: string;
}

export class CategorizeDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Type a description first' })
  @MaxLength(120)
  description: string;

  /** Suggest one of the group category keys instead of my categories. */
  @IsOptional()
  @IsUUID('4', { message: 'Unknown group' })
  groupId?: string;
}
