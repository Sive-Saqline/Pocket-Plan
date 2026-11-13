import {
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { UsersRepository } from '../users/users.repository';

type AuthedRequest = Request & { userId?: string };

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly users: UsersRepository,
  ) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthedRequest>();
    const [scheme, token] = request.headers.authorization?.split(' ') ?? [];
    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException('Sign in to continue');
    }
    let payload: { sub: string; iat: number };
    try {
      payload = await this.jwt.verifyAsync(token);
    } catch {
      throw new UnauthorizedException('Your session has expired');
    }
    // Tokens from before a password change (or for deleted accounts) stop working.
    const user = await this.users.findById(payload.sub);
    if (!user || payload.iat < (user.passwordChangedAt ?? 0)) {
      throw new UnauthorizedException('Your session has expired');
    }
    request.userId = payload.sub;
    return true;
  }
}

export const CurrentUserId = createParamDecorator(
  (_: unknown, context: ExecutionContext) =>
    context.switchToHttp().getRequest<AuthedRequest>().userId,
);
