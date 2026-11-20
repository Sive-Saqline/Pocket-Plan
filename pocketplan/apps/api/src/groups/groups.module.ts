import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { GroupExpensesService } from './group-expenses.service';
import {
  GroupReportsController,
  GroupsController,
  InvitesController,
} from './groups.controller';
import { GroupsService } from './groups.service';
import { InviteMailer, SupabaseInviteMailer } from './invite-mailer';

@Module({
  imports: [AuthModule],
  controllers: [GroupsController, InvitesController, GroupReportsController],
  providers: [
    GroupsService,
    GroupExpensesService,
    { provide: InviteMailer, useClass: SupabaseInviteMailer },
  ],
  exports: [GroupsService, GroupExpensesService],
})
export class GroupsModule {}
