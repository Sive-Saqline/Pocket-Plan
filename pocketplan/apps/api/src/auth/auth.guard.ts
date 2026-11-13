import {
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { UsersRepository } from '../users/users.repository';
import { TokenVerifier } from './token-verifier';

type AuthedRequest = Request & { userId?: string };

/**
 * Requires a valid Supabase sign-in token (Authorization: Bearer <token>)
 * belonging to a user who still has a PocketPlan profile.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly tokens: TokenVerifier,
    private readonly users: UsersRepository,
  ) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthedRequest>();
    const [scheme, token] = request.headers.authorization?.split(' ') ?? [];
    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException('Sign in to continue');
    }
    let userId: string;
    try {
      userId = await this.tokens.verify(token);
    } catch {
      throw new UnauthorizedException('Your session has expired');
    }
    // Deleted accounts stop working even if their token hasn't expired yet.
    if (!(await this.users.findById(userId))) {
      throw new UnauthorizedException('Your session has expired');
    }
    request.userId = userId;
    return true;
  }
}

export const CurrentUserId = createParamDecorator(
  (_: unknown, context: ExecutionContext) =>
    context.switchToHttp().getRequest<AuthedRequest>().userId,
);
