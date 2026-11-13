import { Transform, Type } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsOptional,
  ValidateNested,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { THEMES, type Theme } from '../users/users.repository';

const normaliseEmail = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

export class RegisterDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty({ message: 'Name is required' })
  @MaxLength(60)
  name: string;

  @Transform(normaliseEmail)
  @IsEmail({}, { message: 'Enter a valid email address' })
  email: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  // bcrypt only uses the first 72 bytes
  @MaxLength(72, { message: 'Password must be at most 72 characters' })
  password: string;
}

export class LoginDto {
  @Transform(normaliseEmail)
  @IsEmail({}, { message: 'Enter a valid email address' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  password: string;
}

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

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty({ message: 'Enter your current password' })
  currentPassword: string;

  @IsString()
  @MinLength(8, { message: 'New password must be at least 8 characters' })
  @MaxLength(72, { message: 'New password must be at most 72 characters' })
  newPassword: string;
}
