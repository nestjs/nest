import { Module } from '@nestjs/common';
import { DrizzleModule, getDrizzleToken } from '@nestjs/drizzle';
import { OutboxModule, OutboxStorage } from '@nestjs/outbox';
import { fromDrizzle, PostgresOutboxStore } from '@nestjs/outbox/postgres';
import { drizzle } from 'drizzle-orm/node-postgres';
import { AnalyticsController } from './analytics.controller.js';
import type { Database } from './database/drizzle.js';
import * as schema from './database/schema.js';
import { OrderStatsService } from './order-stats.service.js';

@Module({
  imports: [
    DrizzleModule.forRootAsync({
      // This service's own database, not the order API's.
      useFactory: () => ({
        drizzle,
        connection: process.env.DATABASE_URL!,
        schema,
      }),
    }),
    // Consumer only: no relay runs.
    OutboxModule.forRoot({ relay: { enabled: false } }),
  ],
  controllers: [AnalyticsController],
  providers: [
    {
      // This service's inbox, in its own database (the store's tables for messages stay empty)
      provide: PostgresOutboxStore,
      inject: [getDrizzleToken(), OutboxStorage],
      useFactory: (db: Database, outboxStorage: OutboxStorage) =>
        new PostgresOutboxStore({ executor: fromDrizzle(db) }, outboxStorage),
    },
    OrderStatsService,
  ],
})
export class AppModule {}
