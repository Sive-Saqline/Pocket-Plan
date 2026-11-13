import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { SupabaseTokenVerifier, TokenVerifier } from './token-verifier';

@Module({
  imports: [UsersModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthGuard,
    { provide: TokenVerifier, useClass: SupabaseTokenVerifier },
  ],
  // Guards run in the importing module, so it needs what AuthGuard injects.
  exports: [AuthGuard, TokenVerifier, UsersModule],
})
export class AuthModule {}
