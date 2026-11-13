import { Injectable } from '@nestjs/common';
import { Prisma, type User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  ProfileUpdate,
  UserProfile,
  UsersRepository,
} from './users.repository';

const toProfile = (u: User): UserProfile => ({
  id: u.id,
  name: u.name,
  email: u.email,
  createdAt: u.createdAt.toISOString(),
  theme: u.theme,
  avatarUrl: u.avatarUrl,
});

@Injectable()
export class PrismaUsersRepository extends UsersRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    return user && toProfile(user);
  }

  async update(id: string, { name, theme, avatarUrl }: ProfileUpdate) {
    try {
      // Prisma skips undefined fields, so only what was sent changes.
      const user = await this.prisma.user.update({
        where: { id },
        data: { name, theme, avatarUrl },
      });
      return toProfile(user);
    } catch (err) {
      // P2025: no row with that id
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2025'
      ) {
        return null;
      }
      throw err;
    }
  }
}
