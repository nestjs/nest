import { PGlite } from '@electric-sql/pglite';
import { getDrizzleToken } from '@nestjs/drizzle';
import { Outbox, OutboxRelay } from '@nestjs/outbox';
import { Test, type TestingModule } from '@nestjs/testing';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { fileURLToPath } from 'node:url';
import { of } from 'rxjs';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { ANALYTICS_SERVICE, AppModule } from '../src/app.module.js';
import * as schema from '../src/database/schema.js';
import { MailerService } from '../src/notifications/mailer.service.js';
import { OrdersService } from '../src/orders/orders.service.js';

describe('OrdersService (outbox)', () => {
  const client = new PGlite(); // PostgreSQL, in-process
  const db = drizzle(client, { schema });
  const mailer = { sendOrderConfirmation: vi.fn() };
  const analytics = { emit: vi.fn(() => of(undefined)) };
  let moduleRef: TestingModule;
  let orders: OrdersService;
  let relay: OutboxRelay;

  beforeAll(async () => {
    // Your migrations: the order tables. The outbox's store creates its schema in init().
    await migrate(db, {
      migrationsFolder: fileURLToPath(new URL('../drizzle', import.meta.url)),
    });
    process.env.OUTBOX_RELAY = 'off'; // no poll loop: the test drives the relay
    moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(getDrizzleToken())
      .useValue(db) // the outbox's store runs on it too
      .overrideProvider(MailerService)
      .useValue(mailer)
      .overrideProvider(ANALYTICS_SERVICE)
      .useValue(analytics)
      .compile();
    await moduleRef.init();
    orders = moduleRef.get(OrdersService);
    relay = moduleRef.get(OutboxRelay);
  });

  afterAll(async () => {
    await moduleRef.close();
    await client.close();
  });

  it('publishes order events only after the order commits', async () => {
    const order = await orders.placeOrder({
      userId: 'user-42',
      items: [{ productId: 'salmon-kibble-2kg', quantity: 1 }],
    });
    expect(mailer.sendOrderConfirmation).not.toHaveBeenCalled();

    await relay.runOnce(); // claim and publish one batch

    expect(mailer.sendOrderConfirmation).toHaveBeenCalledWith(order);
    expect(analytics.emit).toHaveBeenCalledWith(
      'analytics.order.placed',
      expect.objectContaining({ key: order.id, payload: order }),
    );
    expect(await relay.stats()).toMatchObject({ pending: 0, deadLetters: 0 });
  });

  it('publishes nothing when the transaction rolls back', async () => {
    const outbox = moduleRef.get(Outbox);
    const add = outbox.add.bind(outbox);
    vi.spyOn(outbox, 'add').mockImplementationOnce(async (tx, messages) => {
      await add(tx, messages); // the messages are written...
      throw new Error('Connection terminated unexpectedly'); // ...then the transaction fails
    });

    await expect(
      orders.placeOrder({
        userId: 'user-42',
        items: [{ productId: 'salmon-kibble-2kg', quantity: 1 }],
      }),
    ).rejects.toThrow('Connection terminated unexpectedly');

    expect(await relay.stats()).toMatchObject({ pending: 0 });
    expect(await relay.runOnce()).toMatchObject({ claimed: 0 });
  });
});
