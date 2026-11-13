import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import {
  EmailTakenError,
  PublicUser,
  toPublicUser,
  UsersRepository,
} from '../users/users.repository';
import {
  ChangePasswordDto,
  LoginDto,
  RegisterDto,
  UpdateProfileDto,
} from './auth.dto';

const BCRYPT_ROUNDS = 10;
// Compared against when the email is unknown, so response time doesn't reveal
// which emails are registered.
const DUMMY_HASH =
  '$2a$10$1RE0nHhdfV85n9Bn2yOOYObflH4Cb/IthzGhnlmu/nLQnVHbTk4ta';

export interface AuthResult {
  accessToken: string;
  user: PublicUser;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersRepository,
    private readonly jwt: JwtService,
  ) {}

  async register({ name, email, password }: RegisterDto): Promise<AuthResult> {
    try {
      const user = await this.users.create({
        name,
        email,
        passwordHash: await hash(password, BCRYPT_ROUNDS),
      });
      return this.issue(toPublicUser(user));
    } catch (err) {
      if (err instanceof EmailTakenError) {
        throw new ConflictException(
          'An account with this email already exists',
        );
      }
      throw err;
    }
  }

  async login({ email, password }: LoginDto): Promise<AuthResult> {
    const user = await this.users.findByEmail(email);
    const ok = await compare(password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !ok) {
      throw new UnauthorizedException('Incorrect email or password');
    }
    return this.issue(toPublicUser(user));
  }

  async me(userId: string): Promise<PublicUser> {
    const user = await this.users.findById(userId);
    if (!user) throw new UnauthorizedException('Session is no longer valid');
    return toPublicUser(user);
  }

  async updateProfile(
    userId: string,
    { name, preferences }: UpdateProfileDto,
  ): Promise<PublicUser> {
    const user = await this.users.update(userId, { name, preferences });
    if (!user) throw new UnauthorizedException('Session is no longer valid');
    return toPublicUser(user);
  }

  /**
   * Verifies the current password, stores the new hash, and signs out every
   * other session. Returns a fresh token so this session carries on.
   */
  async changePassword(
    userId: string,
    { currentPassword, newPassword }: ChangePasswordDto,
  ): Promise<AuthResult> {
    const user = await this.users.findById(userId);
    if (!user) throw new UnauthorizedException('Session is no longer valid');
    if (!(await compare(currentPassword, user.passwordHash))) {
      throw new BadRequestException('Current password is incorrect');
    }
    if (currentPassword === newPassword) {
      throw new BadRequestException(
        'New password must be different from the current one',
      );
    }
    const updated = await this.users.update(userId, {
      passwordHash: await hash(newPassword, BCRYPT_ROUNDS),
      passwordChangedAt: Math.floor(Date.now() / 1000),
    });
    return this.issue(toPublicUser(updated!));
  }

  private async issue(user: PublicUser): Promise<AuthResult> {
    return {
      accessToken: await this.jwt.signAsync({ sub: user.id }),
      user,
    };
  }
}
