import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AvatarError, validateAvatar } from '../users/avatar';
import { AvatarStorage } from '../users/avatar-storage';
import {
  PublicUser,
  toPublicUser,
  UsersRepository,
} from '../users/users.repository';
import { UpdateProfileDto } from './auth.dto';

/**
 * The signed-in user's PocketPlan profile. Signing up, signing in, password
 * changes and resets are handled by Supabase Auth in the web app; the API
 * only sees the resulting access token (checked by AuthGuard).
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersRepository,
    private readonly avatars: AvatarStorage,
  ) {}

  async me(userId: string): Promise<PublicUser> {
    const user = await this.users.findById(userId);
    if (!user) throw new UnauthorizedException('Session is no longer valid');
    return toPublicUser(user);
  }

  async updateProfile(
    userId: string,
    { name, preferences }: UpdateProfileDto,
  ): Promise<PublicUser> {
    const user = await this.users.update(userId, {
      name,
      theme: preferences?.theme,
    });
    if (!user) throw new UnauthorizedException('Session is no longer valid');
    return toPublicUser(user);
  }

  /** Sets (image) or removes (null) the profile photo. */
  async setAvatar(userId: string, image: string | null): Promise<PublicUser> {
    const current = await this.users.findById(userId);
    if (!current) throw new UnauthorizedException('Session is no longer valid');

    let avatarUrl: string | null = null;
    if (image !== null) {
      try {
        validateAvatar(image);
      } catch (err) {
        if (err instanceof AvatarError) {
          throw new BadRequestException(err.message);
        }
        throw err;
      }
      avatarUrl = await this.avatars.save(userId, image);
    }
    const user = await this.users.update(userId, { avatarUrl });
    if (!user) throw new UnauthorizedException('Session is no longer valid');
    if (current.avatarUrl && current.avatarUrl !== avatarUrl) {
      await this.avatars.remove(userId, current.avatarUrl);
    }
    return toPublicUser(user);
  }
}
