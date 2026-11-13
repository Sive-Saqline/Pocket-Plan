import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { FileLedgerStore } from './file-ledger.store';
import { LedgerController } from './ledger.controller';
import { LedgerService } from './ledger.service';
import { LedgerStore } from './ledger.store';
import { RecurringController } from './recurring.controller';
import { RecurringService } from './recurring.service';

@Module({
  imports: [AuthModule],
  controllers: [LedgerController, RecurringController],
  providers: [
    LedgerService,
    RecurringService,
    { provide: LedgerStore, useClass: FileLedgerStore },
  ],
})
export class LedgerModule {}
