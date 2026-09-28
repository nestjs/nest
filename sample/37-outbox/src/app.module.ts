import { Module } from '@nestjs/common';
import { DrizzleModule } from '@nestjs/drizzle';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ClientProxyTransport, OutboxModule } from '@nestjs/outbox';
import { drizzle } from 'drizzle-orm/node-postgres';
import { DrizzleOutboxStore } from './database/drizzle-outbox.store.js';
import * as schema from './database/schema.js';
import { InventoryModule } from './inventory/inventory.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';
import { OrdersModule } from './orders/orders.module.js';
import { OutboxAdminModule } from './outbox-admin/outbox-admin.module.js';

export const ANALYTICS_SERVICE = 'ANALYTICS_SERVICE';

@Module({
  imports: [
    DrizzleModule.forRootAsync({
      // A pg pool on DATABASE_URL, closed in onApplicationShutdown(), after the relay drained.
      useFactory: () => ({
        drizzle,
        connection: process.env.DATABASE_URL!,
        schema,
      }),
    }),
    OutboxModule.forRootAsync({
      imports: [
        ClientsModule.registerAsync([
          {
            name: ANALYTICS_SERVICE,
            useFactory: () => ({
              transport: Transport.TCP,
              options: {
                host: process.env.ANALYTICS_HOST ?? '127.0.0.1',
                port: Number(process.env.ANALYTICS_PORT ?? 4001),
              },
            }),
          },
        ]),
      ],
      transports: { analytics: ClientProxyTransport(ANALYTICS_SERVICE) },
      useFactory: () => ({
        // Each message goes to exactly one transport; `local` runs @OnOutboxMessage() handlers.
        route: message =>
          message.topic.startsWith('analytics.') ? 'analytics' : 'local',
        relay: {
          enabled: process.env.OUTBOX_RELAY !== 'off',
          pollInterval: '1s',
          lease: '30s',
          publishTimeout: '10s',
        },
        retry: {
          attempts: 10,
          backoff: { delay: '1s', maxDelay: '1m' },
        },
      }),
    }),
    OrdersModule,
    NotificationsModule,
    InventoryModule,
    OutboxAdminModule,
  ],
  // Registers itself as the outbox's store.
  providers: [DrizzleOutboxStore],
})
export class AppModule {}
