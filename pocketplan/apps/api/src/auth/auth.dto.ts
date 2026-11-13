import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { THEMES, type Theme } from '../users/users.repository';

export class PreferencesDto {
  @IsOptional()
  @IsIn(THEMES, { message: 'Theme must be system, light or dark' })
  theme?: Theme;
}

export class UpdateProfileDto {
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty({ message: 'Name is required' })
  @MaxLength(60)
  name?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => PreferencesDto)
  preferences?: PreferencesDto;
}

export class SetAvatarDto {
  // Content checks (type, signature, size) happen in users/avatar.ts.
  @IsString()
  @IsNotEmpty({ message: 'Choose an image' })
  image: string;
}
