/**
 * PrismaOutboxStore against the package's contract suites (`@nestjs/outbox/testing`), on the
 * PostgreSQL server in SQL_TEST_PG_URL (see support/postgres.ts), with the migrations Prisma
 * Migrate created. Needs the generated client (`npx prisma generate`, which `npm run test:e2e`
 * runs first). Skipped, with the reason, without a server.
 */
import { OutboxStorage } from '@nestjs/outbox';
import {
  outboxInboxStoreContract,
  outboxStoreContract,
  type OutboxStoreHarness,
} from '@nestjs/outbox/testing';
import { afterAll, beforeAll, describe, it } from 'vitest';
import { PrismaOutboxStore } from '../src/prisma/prisma-outbox.store.js';
import {
  PrismaService,
  type Transaction,
} from '../src/prisma/prisma.service.js';
import { startPostgres } from './support/postgres.js';
import { applyPrismaMigrations } from './support/prisma-migrations.js';

const { postgres, reason } = await startPostgres();
afterAll(() => postgres?.stop());

describe.skipIf(!postgres)(
  `PrismaOutboxStore on PostgreSQL${postgres ? '' : ` (skipped: ${reason})`}`,
  () => {
    let prisma: PrismaService;

    beforeAll(async () => {
      const url = await postgres!.createDatabase('outbox_prisma_store');
      await applyPrismaMigrations(url);
      process.env.DATABASE_URL = url; // PrismaService reads it when constructed
      prisma = new PrismaService();
    });
    afterAll(() => prisma?.$disconnect());

    /** A store on emptied tables, built the way Nest builds it: with the client and a registry. */
    async function harness(): Promise<
      OutboxStoreHarness<Transaction> & { store: PrismaOutboxStore }
    > {
      await prisma.$executeRaw`TRUNCATE outbox_messages, outbox_dead_letters, outbox_inbox RESTART IDENTITY`;
      return {
        store: new PrismaOutboxStore(prisma, new OutboxStorage()),
        transaction: work => prisma.$transaction(work),
        notATransaction: prisma,
      };
    }

    describe('the store contract', () => {
      for (const c of outboxStoreContract(harness, { concurrent: true }))
        it(c.name, c.run);
    });

    describe('the inbox contract', () => {
      for (const c of outboxInboxStoreContract(harness, { concurrent: true }))
        it(c.name, c.run);
    });
  },
);
