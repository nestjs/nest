/**
 * TypeOrmOutboxStore against the package's contract suites (`@nestjs/outbox/testing`), on
 * the PostgreSQL server in SQL_TEST_PG_URL (see support/postgres.ts), with the migrations the
 * TypeORM CLI generated. A pool, so the concurrency cases' transactions really overlap.
 * Skipped, with the reason, without a server.
 */
import { OutboxStorage } from '@nestjs/outbox';
import {
  outboxInboxStoreContract,
  outboxStoreContract,
  type OutboxStoreHarness,
} from '@nestjs/outbox/testing';
import { DataSource, type EntityManager } from 'typeorm';
import { afterAll, beforeAll, describe, it } from 'vitest';
import { dataSourceOptions } from '../src/typeorm/data-source.js';
import { TypeOrmOutboxStore } from '../src/typeorm/typeorm-outbox.store.js';
import { startPostgres } from './support/postgres.js';

const { postgres, reason } = await startPostgres();
afterAll(() => postgres?.stop());

describe.skipIf(!postgres)(
  `TypeOrmOutboxStore on PostgreSQL${postgres ? '' : ` (skipped: ${reason})`}`,
  () => {
    let dataSource: DataSource;
    let url: string;

    beforeAll(async () => {
      url = await postgres!.createDatabase('outbox_typeorm_store');
      dataSource = await new DataSource({
        ...dataSourceOptions,
        url,
        poolSize: 12,
      }).initialize();
      await dataSource.runMigrations();
    });
    afterAll(() => dataSource?.destroy());

    /** A store on emptied tables, built the way Nest builds it: with the data source and a registry. */
    async function harness(): Promise<
      OutboxStoreHarness<EntityManager> & { store: TypeOrmOutboxStore }
    > {
      await dataSource.query(
        'TRUNCATE outbox_messages, outbox_dead_letters, outbox_inbox RESTART IDENTITY',
      );
      return {
        store: new TypeOrmOutboxStore(dataSource, new OutboxStorage()),
        transaction: work => dataSource.transaction(work),
        notATransaction: dataSource.manager,
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
