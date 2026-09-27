/**
 * DrizzleOutboxStore against the package's contract suites (`@nestjs/outbox/testing`), with
 * the migrations drizzle-kit generated: on PGlite (PostgreSQL in this process, always runs),
 * and on the PostgreSQL server in SQL_TEST_PG_URL (see support/postgres.ts), through a pool,
 * where the concurrency cases' transactions really overlap. Skipped, with the reason, without
 * a server.
 */
import { PGlite } from '@electric-sql/pglite';
import { OutboxStorage } from '@nestjs/outbox';
import {
  outboxInboxStoreContract,
  outboxStoreContract,
  type OutboxStoreHarness,
} from '@nestjs/outbox/testing';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import { migrate as migratePglite } from 'drizzle-orm/pglite/migrator';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { afterAll, beforeAll, describe, it } from 'vitest';
import { DrizzleOutboxStore } from '../src/database/drizzle-outbox.store.js';
import type { Database, Transaction } from '../src/database/drizzle.js';
import * as schema from '../src/database/schema.js';
import { startPostgres } from './support/postgres.js';

const migrationsFolder = fileURLToPath(new URL('../drizzle', import.meta.url));

/** A store on emptied tables, built the way Nest builds it: with the database and a registry. */
async function freshStore(
  db: Database,
): Promise<OutboxStoreHarness<Transaction> & { store: DrizzleOutboxStore }> {
  await db.execute(
    sql`TRUNCATE outbox_messages, outbox_dead_letters, outbox_inbox RESTART IDENTITY`,
  );
  const store = new DrizzleOutboxStore(db, new OutboxStorage());
  return {
    store,
    transaction: work => db.transaction(work),
    notATransaction: db,
  };
}

describe('DrizzleOutboxStore on PGlite: the store contract', () => {
  const client = new PGlite();
  const db = drizzlePglite(client, { schema }) as unknown as Database;
  beforeAll(() => migratePglite(db as never, { migrationsFolder }));
  afterAll(() => client.close());

  // The concurrency cases run too; with one connection, PGlite runs them one transaction at a time.
  for (const c of outboxStoreContract(() => freshStore(db), {
    concurrent: true,
  }))
    it(c.name, c.run);
  describe('the inbox contract', () => {
    for (const c of outboxInboxStoreContract(() => freshStore(db), {
      concurrent: true,
    }))
      it(c.name, c.run);
  });
});

const { postgres, reason } = await startPostgres();
afterAll(() => postgres?.stop());

describe.skipIf(!postgres)(
  `DrizzleOutboxStore on PostgreSQL${postgres ? '' : ` (skipped: ${reason})`}`,
  () => {
    let pool: pg.Pool;
    let db: Database;

    beforeAll(async () => {
      const url = await postgres!.createDatabase('outbox_drizzle_store');
      pool = new pg.Pool({ connectionString: url, max: 12 });
      db = drizzle(pool, { schema });
      await migrate(db, { migrationsFolder });
    });
    afterAll(() => pool?.end());

    describe('the store contract', () => {
      for (const c of outboxStoreContract(() => freshStore(db), {
        concurrent: true,
      }))
        it(c.name, c.run);
    });

    describe('the inbox contract', () => {
      for (const c of outboxInboxStoreContract(() => freshStore(db), {
        concurrent: true,
      }))
        it(c.name, c.run);
    });
  },
);
