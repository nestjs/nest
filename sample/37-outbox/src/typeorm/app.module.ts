import { Module } from '@nestjs/common';
import { OutboxModule } from '@nestjs/outbox';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { dataSourceOptions } from './data-source.js';
import { OrdersService } from './orders.service.js';
import { TypeOrmOutboxStore } from './typeorm-outbox.store.js';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      // The entities and migrations the CLI uses; migrations run on deploy (`migration:run`).
      useFactory: () => ({
        ...dataSourceOptions,
        url: process.env.DATABASE_URL,
      }),
    }),
    OutboxModule.forRoot({ relay: { pollInterval: '1s' } }),
    NotificationsModule,
  ],
  // TypeOrmOutboxStore registers itself as the outbox's store.
  providers: [TypeOrmOutboxStore, OrdersService],
})
export class AppModule {}
