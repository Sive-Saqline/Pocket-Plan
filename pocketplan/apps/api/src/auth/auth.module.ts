import { Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';

const DEV_SECRET = 'pocketplan-dev-only-secret';

@Module({
  imports: [
    UsersModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.get<string>('JWT_SECRET');
        if (!secret) {
          if (config.get('NODE_ENV') === 'production') {
            throw new Error('JWT_SECRET must be set in production');
          }
          new Logger('AuthModule').warn(
            'JWT_SECRET not set; using an insecure development secret',
          );
        }
        return {
          secret: secret ?? DEV_SECRET,
          signOptions: { expiresIn: '7d' },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthGuard],
  // Guards run in the importing module, so it needs what AuthGuard injects.
  exports: [AuthGuard, JwtModule, UsersModule],
})
export class AuthModule {}
