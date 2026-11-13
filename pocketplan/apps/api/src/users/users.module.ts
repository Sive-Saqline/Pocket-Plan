import { Module } from '@nestjs/common';
import { FileUsersRepository } from './file-users.repository';
import { UsersRepository } from './users.repository';

@Module({
  providers: [{ provide: UsersRepository, useClass: FileUsersRepository }],
  exports: [UsersRepository],
})
export class UsersModule {}
