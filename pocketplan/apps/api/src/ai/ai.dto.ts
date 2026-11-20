import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
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

/** The report on screen (Step 20): what an insight is about. */
export class ReportViewDto {
  /** First and last day shown (YYYY-MM-DD, inclusive). */
  @Matches(DATE, { message: 'start must be YYYY-MM-DD' })
  start: string;

  @Matches(DATE, { message: 'end must be YYYY-MM-DD' })
  end: string;

  @IsOptional()
  @IsUUID('4', { message: 'Unknown group' })
  groupId?: string;

  /** Personal: category ids. Group: category keys. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  categories?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  wallets?: string[];

  /** The user's local date (what "this month" means). */
  @IsOptional()
  @Matches(DATE, { message: 'today must be YYYY-MM-DD' })
  today?: string;
}

/** A question about spending, asked from the report currently on screen. */
export class ReportAskDto extends ReportViewDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Ask something, e.g. "Food in the last 3 months"' })
  @MaxLength(300, { message: 'Keep the question under 300 characters' })
  question: string;
}
