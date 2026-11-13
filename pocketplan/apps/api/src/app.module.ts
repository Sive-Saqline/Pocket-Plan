import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { BalancesModule } from './balances/balances.module';
import { LedgerModule } from './ledger/ledger.module';
import { HealthController } from './health/health.controller';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    BalancesModule,
    LedgerModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
