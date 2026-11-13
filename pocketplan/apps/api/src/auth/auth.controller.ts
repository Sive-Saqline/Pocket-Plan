import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ChangePasswordDto,
  LoginDto,
  RegisterDto,
  SetAvatarDto,
  UpdateProfileDto,
} from './auth.dto';
import { AuthGuard, CurrentUserId } from './auth.guard';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  register(@Body() body: RegisterDto) {
    return this.auth.register(body);
  }

  @Post('login')
  @HttpCode(200)
  login(@Body() body: LoginDto) {
    return this.auth.login(body);
  }

  @Get('me')
  @UseGuards(AuthGuard)
  me(@CurrentUserId() userId: string) {
    return this.auth.me(userId);
  }

  @Patch('me')
  @UseGuards(AuthGuard)
  updateProfile(
    @CurrentUserId() userId: string,
    @Body() body: UpdateProfileDto,
  ) {
    return this.auth.updateProfile(userId, body);
  }

  /** Sets the profile photo. Body: { image: "data:image/jpeg;base64,..." }. */
  @Put('me/avatar')
  @UseGuards(AuthGuard)
  setAvatar(@CurrentUserId() userId: string, @Body() body: SetAvatarDto) {
    return this.auth.setAvatar(userId, body.image);
  }

  @Delete('me/avatar')
  @UseGuards(AuthGuard)
  removeAvatar(@CurrentUserId() userId: string) {
    return this.auth.setAvatar(userId, null);
  }

  @Post('change-password')
  @HttpCode(200)
  @UseGuards(AuthGuard)
  changePassword(
    @CurrentUserId() userId: string,
    @Body() body: ChangePasswordDto,
  ) {
    return this.auth.changePassword(userId, body);
  }
}
