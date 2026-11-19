import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { GroupsModule } from '../groups/groups.module';
import { LedgerModule } from '../ledger/ledger.module';
import { ReportsController } from './reports.controller';

/** Reports read both personal (LedgerModule) and group (GroupsModule) data. */
@Module({
  imports: [AuthModule, LedgerModule, GroupsModule],
  controllers: [ReportsController],
})
export class ReportsModule {}
