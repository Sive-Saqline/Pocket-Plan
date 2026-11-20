import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { GroupsModule } from '../groups/groups.module';
import { LedgerModule } from '../ledger/ledger.module';
import { AiController } from './ai.controller';
import { AiProvider } from './ai.provider';
import { AiService } from './ai.service';
import { GeminiProvider } from './gemini.provider';

/** Step 18: plain-language entry and auto-categorize. Tests swap the provider. */
@Module({
  imports: [AuthModule, LedgerModule, GroupsModule],
  controllers: [AiController],
  providers: [AiService, { provide: AiProvider, useClass: GeminiProvider }],
})
export class AiModule {}
