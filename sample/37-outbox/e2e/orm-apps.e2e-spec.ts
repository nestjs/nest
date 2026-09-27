/**
 * The TypeORM and Prisma versions of the order API (src/typeorm, src/prisma), end to end: an
 * order and its message written in one ORM transaction, rolled back together, and published
 * by the relay. On the PostgreSQL server in SQL_TEST_PG_URL (see support/postgres.ts), each on
 * a database of its own. Skipped, with the reason, without a server.
 */
import type { INestApplicationContext, Type } from '@nestjs/common';
import { Outbox, OutboxRelay } from '@nestjs/outbox';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Order } from '../src/orders/order.js';
import { AppModule as PrismaAppModule } from '../src/prisma/app.module.js';
import { OrdersService as PrismaOrdersService } from '../src/prisma/orders.service.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { AppModule as TypeOrmAppModule } from '../src/typeorm/app.module.js';
import { dataSourceOptions } from '../src/typeorm/data-source.js';
import { OrderEntity } from '../src/typeorm/order.entity.js';
import { OrdersService as TypeOrmOrdersService } from '../src/typeorm/orders.service.js';
import { OutboxInboxEntity } from '../src/typeorm/outbox.entities.js';
import { capturingLogger, until } from './support/helpers.js';
import { startPostgres } from './support/postgres.js';
import { applyPrismaMigrations } from './support/prisma-migrations.js';

/** What the tests do through each ORM. */
interface Orm {
  name: string;
  module: Type<unknown>;
  /** Applies the ORM's migrations, as a deploy does. */
  migrate(url: string): Promise<void>;
  placeOrder(app: INestApplicationContext): Promise<Order>;
  /** Writes the order and its message in one transaction, which then fails. */
  failAfterAdd(app: INestApplicationContext, order: Order): Promise<void>;
  orderExists(app: INestApplicationContext, id: string): Promise<boolean>;
  inboxRecords(app: INestApplicationContext, consumer: string): Promise<number>;
}

const items = [{ productId: 'salmon-kibble-2kg', quantity: 1 }];

const orms: Orm[] = [
  {
    name: 'TypeORM',
    module: TypeOrmAppModule,
    async migrate(url) {
      const dataSource = await new DataSource({
        ...dataSourceOptions,
        url,
      }).initialize();
      await dataSource.runMigrations();
      await dataSource.destroy();
    },
    placeOrder: app =>
      app.get(TypeOrmOrdersService).placeOrder({ userId: 'user-42', items }),
    failAfterAdd: (app, order) =>
      app.get(DataSource).transaction(async manager => {
        await manager.insert(OrderEntity, order);
        await app
          .get(Outbox)
          .add(manager, { topic: 'order.placed', payload: order });
        throw new Error('payment declined');
      }),
    orderExists: (app, id) =>
      app.get(DataSource).manager.existsBy(OrderEntity, { id }),
    inboxRecords: (app, consumer) =>
      app.get(DataSource).manager.countBy(OutboxInboxEntity, { consumer }),
  },
  {
    name: 'Prisma',
    module: PrismaAppModule,
    migrate: applyPrismaMigrations,
    placeOrder: app =>
      app.get(PrismaOrdersService).placeOrder({ userId: 'user-42', items }),
    failAfterAdd: (app, order) =>
      app.get(PrismaService).$transaction(async tx => {
        await tx.order.create({
          data: { ...order, items: order.items as object[] },
        });
        await app
          .get(Outbox)
          .add(tx, { topic: 'order.placed', payload: order });
        throw new Error('payment declined');
      }),
    orderExists: async (app, id) =>
      (await app.get(PrismaService).order.count({ where: { id } })) === 1,
    inboxRecords: (app, consumer) =>
      app.get(PrismaService).outboxInbox.count({ where: { consumer } }),
  },
];

const { postgres, reason } = await startPostgres();
afterAll(() => postgres?.stop());

describe.skipIf(!postgres).each(orms)(
  `The order API with $name${postgres ? '' : ` (skipped: ${reason})`}`,
  orm => {
    let app: INestApplicationContext;
    const logger = capturingLogger();
    const context = () => ({ app, logger });

    beforeAll(async () => {
      const url = await postgres!.createDatabase(
        `outbox_${orm.name.toLowerCase()}_app`,
      );
      await orm.migrate(url);
      process.env.DATABASE_URL = url; // both applications read it when they start
      const moduleRef = await Test.createTestingModule({
        imports: [orm.module],
      })
        .setLogger(logger.logger)
        .compile();
      app = await moduleRef.init();
    });
    afterAll(() => app?.close());

    it('registers its store', () => {
      expect(logger.lines).toContain(
        `[OutboxModule] OutboxStorage: ${orm.name === 'TypeORM' ? 'TypeOrm' : orm.name}OutboxStore`,
      );
    });

    it('writes the order and its message in one transaction, and the relay publishes it', async () => {
      const { app, logger } = context();
      const order = await orm.placeOrder(app);
      expect(await orm.orderExists(app, order.id)).toBe(true);

      const sent = `[MailerService] Order confirmation for ${order.id} sent to user-42`;
      await until(() => logger.lines.includes(sent));
      await until(
        async () => (await app.get(OutboxRelay).stats()).pending === 0,
      );
      expect(logger.matching(sent)).toHaveLength(1);
      // The handler's inbox recorded the message, through the store.
      expect(await orm.inboxRecords(app, 'order-confirmation-email')).toBe(1);
    });

    it('rolls the message back with the order', async () => {
      const { app } = context();
      const order: Order = {
        id: randomUUID(),
        userId: 'user-42',
        items: [{ ...items[0], price: 2499 }],
        total: 2499,
        status: 'placed',
      };
      await expect(orm.failAfterAdd(app, order)).rejects.toThrow(
        'payment declined',
      );

      expect(await orm.orderExists(app, order.id)).toBe(false);
      const stats = await app.get(OutboxRelay).stats();
      expect([stats.pending, stats.deadLetters]).toEqual([0, 0]);
    });
  },
);
