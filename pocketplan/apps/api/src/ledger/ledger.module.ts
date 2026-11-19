import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { LedgerController } from './ledger.controller';
import { LedgerService } from './ledger.service';
import { LedgerStore } from './ledger.store';
import { PrismaLedgerStore } from './prisma-ledger.store';
import { RecurringController } from './recurring.controller';
import { RecurringService } from './recurring.service';

@Module({
  imports: [AuthModule],
  controllers: [LedgerController, RecurringController],
  providers: [
    LedgerService,
    RecurringService,
    // Supabase Postgres. Tests swap in FileLedgerStore (no database needed).
    { provide: LedgerStore, useClass: PrismaLedgerStore },
  ],
  exports: [LedgerService],
})
export class LedgerModule {}
