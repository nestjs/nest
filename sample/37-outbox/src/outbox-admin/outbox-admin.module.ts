import { Module } from '@nestjs/common';
import { AdminGuard } from './admin.guard.js';
import { OutboxAdminController } from './outbox-admin.controller.js';
import { OutboxMetrics } from './outbox-metrics.service.js';

@Module({
  controllers: [OutboxAdminController],
  providers: [AdminGuard, OutboxMetrics],
})
export class OutboxAdminModule {}
