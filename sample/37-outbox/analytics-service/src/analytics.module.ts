import { Module } from '@nestjs/common';
import { DrizzleModule } from '@nestjs/drizzle';
import { OutboxModule } from '@nestjs/outbox';
import { drizzle } from 'drizzle-orm/node-postgres';
import { AnalyticsController } from './analytics.controller.js';
import { DrizzleInboxStore } from './database/drizzle-inbox.store.js';
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
    // Consumer only: the store holds this service's inbox, and no relay runs.
    OutboxModule.forRoot({ relay: { enabled: false } }),
  ],
  controllers: [AnalyticsController],
  providers: [DrizzleInboxStore, OrderStatsService],
})
export class AnalyticsModule {}
