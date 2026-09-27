import { Module } from '@nestjs/common';
import { OutboxModule } from '@nestjs/outbox';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { DatabaseModule } from './database.module.js';
import { OrdersService } from './orders.service.js';
import { PrismaOutboxStore } from './prisma-outbox.store.js';

@Module({
  imports: [
    DatabaseModule,
    OutboxModule.forRoot({ relay: { pollInterval: '1s' } }),
    NotificationsModule,
  ],
  // PrismaOutboxStore registers itself as the outbox's store.
  providers: [PrismaOutboxStore, OrdersService],
})
export class AppModule {}
