import { Module } from '@nestjs/common';
import { DrizzleModule, getDrizzleToken } from '@nestjs/drizzle';
import { OutboxModule, OutboxStorage } from '@nestjs/outbox';
import { PostgresOutboxStore } from '@nestjs/outbox/postgres';
import { WebhooksModule, WebhooksStorage } from '@nestjs/webhooks';
import { fromDrizzle, PostgresWebhookStore } from '@nestjs/webhooks/postgres';
import { drizzle } from 'drizzle-orm/node-postgres';
import type { Database } from './database/drizzle.js';
import * as schema from './database/schema.js';
import { OrdersModule } from './orders/orders.module.js';
import { PartnerWebhooksModule } from './partner-webhooks/partner-webhooks.module.js';
import { ProviderWebhooksModule } from './provider-webhooks/provider-webhooks.module.js';

@Module({
  imports: [
    // A pg pool on DATABASE_URL, closed in onApplicationShutdown(), after the relay and the
    // worker drained. The services inject it with @InjectDrizzle(), the stores' factories too.
    DrizzleModule.forRootAsync({
      useFactory: () => ({
        drizzle,
        connection: process.env.DATABASE_URL!,
        schema,
      }),
    }),
    // Outgoing webhooks travel through the outbox: dispatched in the order's transaction,
    // handed to the webhooks worker after the commit.
    OutboxModule.forRootAsync({
      useFactory: () => ({
        relay: {
          enabled: process.env.OUTBOX_RELAY !== 'off',
          pollInterval: '1s',
        },
      }),
    }),
    WebhooksModule.forRootAsync({
      useFactory: () => ({
        // The types partners may subscribe to; dispatch() refuses any other.
        eventTypes: ['order.shipped', 'order.cancelled'],
        // Ten attempts: 5s, 20s, 80s, ... capped at a day, about two days in all.
        retry: {
          attempts: 10,
          backoff: { delay: '5s', factor: 4, maxDelay: '1d' },
        },
        // An endpoint that fails every attempt for five days is switched off.
        disableEndpointAfter: '5d',
        delivery: {
          timeout: '15s',
          // Development only: deliver over http:// and to this machine. Without it, only
          // public https:// endpoints are accepted.
          allowHttp: process.env.WEBHOOKS_ALLOW_LOCAL === '1',
          allowPrivateNetworks: process.env.WEBHOOKS_ALLOW_LOCAL === '1',
        },
        worker: {
          enabled: process.env.WEBHOOKS_WORKER !== 'off',
          pollInterval: '1s',
        },
        // Endpoint secrets at rest: the first key encrypts, every key decrypts.
        encryption: process.env.WEBHOOKS_ENCRYPTION_KEYS
          ? {
              keys: process.env.WEBHOOKS_ENCRYPTION_KEYS.split(',').map(key =>
                key.trim(),
              ),
            }
          : undefined,
        // The senders whose webhooks this API accepts, by the name @VerifyWebhook() uses.
        receivers: {
          // The payment provider follows Standard Webhooks: webhook-id, webhook-timestamp, webhook-signature.
          payments: {
            scheme: 'standard',
            secret: process.env.PAYMENTS_WEBHOOK_SECRET!,
          },
          // The carrier copied Stripe's scheme under its own header: Carrier-Signature: t=...,v1=...
          carrier: {
            scheme: 'stripe',
            header: 'Carrier-Signature',
            secret: process.env.CARRIER_WEBHOOK_SECRET!,
          },
        },
      }),
    }),
    OrdersModule,
    PartnerWebhooksModule,
    ProviderWebhooksModule,
  ],
  providers: [
    {
      // Outbox messages and the inbox, in your database, in a schema of their own (nest_outbox)
      provide: PostgresOutboxStore,
      inject: [getDrizzleToken(), OutboxStorage],
      useFactory: (db: Database, outboxStorage: OutboxStorage) =>
        new PostgresOutboxStore({ executor: fromDrizzle(db) }, outboxStorage),
    },
    {
      // Endpoints, deliveries and their log, in your database, in a schema of their own (nest_webhooks)
      provide: PostgresWebhookStore,
      inject: [getDrizzleToken(), WebhooksStorage],
      useFactory: (db: Database, webhooksStorage: WebhooksStorage) =>
        new PostgresWebhookStore(
          { executor: fromDrizzle(db) },
          webhooksStorage,
        ),
    },
  ],
})
export class AppModule {}
