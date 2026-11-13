import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

// Connects lazily on the first query, so the API boots without a database.
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
