import { Module } from '@nestjs/common';
import { AvatarStorage, SupabaseAvatarStorage } from './avatar-storage';
import { PrismaUsersRepository } from './prisma-users.repository';
import { UsersRepository } from './users.repository';

@Module({
  providers: [
    { provide: UsersRepository, useClass: PrismaUsersRepository },
    { provide: AvatarStorage, useClass: SupabaseAvatarStorage },
  ],
  exports: [UsersRepository, AvatarStorage],
})
export class UsersModule {}
