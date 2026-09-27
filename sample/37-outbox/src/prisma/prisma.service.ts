import { Injectable, type OnApplicationShutdown } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, type Prisma } from './generated/client.js';

/** The `tx` that `prisma.$transaction(async (tx) => ...)` passes its callback. */
export type Transaction = Prisma.TransactionClient;

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnApplicationShutdown
{
  constructor() {
    super({
      adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
    });
  }

  // Runs after onModuleDestroy(), where the outbox relay finishes its in-flight work.
  async onApplicationShutdown() {
    await this.$disconnect();
  }
}
