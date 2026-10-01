/**
 * The analytics service, as the order API's relay reaches it: a TCP microservice that gets
 * outbox envelopes from a ClientProxy. Its database is PGlite (PostgreSQL, in-process), with
 * the service's own migrations; the outbox's store creates its inbox there at startup.
 */
import { PGlite } from '@electric-sql/pglite';
import type { INestMicroservice } from '@nestjs/common';
import { getDrizzleToken } from '@nestjs/drizzle';
import {
  ClientProxyFactory,
  Transport,
  type ClientProxy,
  type MicroserviceOptions,
} from '@nestjs/microservices';
import type { OutboxEnvelope } from '@nestjs/outbox';
import { Test } from '@nestjs/testing';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { lastValueFrom } from 'rxjs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule as AnalyticsAppModule } from '../analytics-service/src/app.module.js';
import * as schema from '../analytics-service/src/database/schema.js';
import {
  OrderStatsService,
  type OrderSnapshot,
} from '../analytics-service/src/order-stats.service.js';
import { freePort, until } from './support/helpers.js';

describe('Analytics service (outbox consumer)', () => {
  const pglite = new PGlite(); // PostgreSQL, in-process
  const db = drizzle(pglite, { schema });
  let app: INestMicroservice;
  let client: ClientProxy;
  let stats: OrderStatsService;

  /** The envelope ClientProxyTransport emits for a message of the order API's outbox. */
  const envelope = (
    topic: string,
    order: OrderSnapshot,
    id: string = randomUUID(),
  ): OutboxEnvelope<OrderSnapshot> => ({
    id,
    topic,
    key: order.id,
    headers: {},
    createdAt: Date.now(),
    payload: order,
  });
  const publish = (message: OutboxEnvelope<OrderSnapshot>) =>
    lastValueFrom(client.emit(message.topic, message));

  beforeAll(async () => {
    await migrate(db, {
      migrationsFolder: fileURLToPath(
        new URL('../analytics-service/drizzle', import.meta.url),
      ),
    });
    const options = { host: '127.0.0.1', port: await freePort() };
    const moduleRef = await Test.createTestingModule({
      imports: [AnalyticsAppModule],
    })
      .overrideProvider(getDrizzleToken())
      .useValue(db) // the outbox's store runs on it too
      .compile();
    app = moduleRef.createNestMicroservice<MicroserviceOptions>({
      transport: Transport.TCP,
      options,
    });
    await app.listen();
    client = ClientProxyFactory.create({ transport: Transport.TCP, options });
    stats = app.get(OrderStatsService);
  });

  afterAll(async () => {
    await client.close();
    await app.close();
    await pglite.close();
  });

  it("records an order's events in the order they were published", async () => {
    const order = { id: randomUUID(), total: 4998 };
    await publish(envelope('analytics.order.placed', order));
    await publish(envelope('analytics.order.cancelled', order));

    await until(async () => (await stats.timeline(order.id)).length === 2);

    expect(await stats.timeline(order.id)).toEqual(['placed', 'cancelled']);
    expect(await stats.revenue()).toBe(0);
  });

  it('records a redelivered message once', async () => {
    const order = { id: randomUUID(), total: 2499 };
    const placed = envelope('analytics.order.placed', order);
    await publish(placed);
    await publish(placed); // the relay died after publishing, before recording it
    // A later message with the same key is handled after both deliveries.
    await publish(envelope('analytics.order.cancelled', order));

    await until(async () => (await stats.timeline(order.id)).length === 2);

    expect(await stats.timeline(order.id)).toEqual(['placed', 'cancelled']);
  });
});
