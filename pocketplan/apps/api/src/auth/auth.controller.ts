import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Put,
  UseGuards,
} from '@nestjs/common';
import { SetAvatarDto, UpdateProfileDto } from './auth.dto';
import { AuthGuard, CurrentUserId } from './auth.guard';
import { AuthService } from './auth.service';

/**
 * Profile of the signed-in user. Registration, sign-in, password change and
 * password reset happen in Supabase Auth (web app), not here.
 */
@Controller('auth')
@UseGuards(AuthGuard)
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Get('me')
  me(@CurrentUserId() userId: string) {
    return this.auth.me(userId);
  }

  @Patch('me')
  updateProfile(
    @CurrentUserId() userId: string,
    @Body() body: UpdateProfileDto,
  ) {
    return this.auth.updateProfile(userId, body);
  }

  /** Sets the profile photo. Body: { image: "data:image/jpeg;base64,..." }. */
  @Put('me/avatar')
  setAvatar(@CurrentUserId() userId: string, @Body() body: SetAvatarDto) {
    return this.auth.setAvatar(userId, body.image);
  }

  @Delete('me/avatar')
  removeAvatar(@CurrentUserId() userId: string) {
    return this.auth.setAvatar(userId, null);
  }
}
