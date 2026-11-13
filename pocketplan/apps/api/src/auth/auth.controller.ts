import {
  Body,
  Controller,
  Get,
  HttpCode,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ChangePasswordDto,
  LoginDto,
  RegisterDto,
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
