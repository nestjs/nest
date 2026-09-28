import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { OutboxDeadLetters } from '@nestjs/outbox';
import { AdminGuard } from './admin.guard.js';
import { OutboxMetrics } from './outbox-metrics.service.js';

@Controller('admin/outbox')
@UseGuards(AdminGuard)
export class OutboxAdminController {
  constructor(
    private readonly outboxDeadLetters: OutboxDeadLetters,
    private readonly outboxMetrics: OutboxMetrics,
  ) {}

  @Get('dead-letters')
  list(@Query('topic') topic?: string) {
    return this.outboxDeadLetters.list({ topic });
  }

  @Post('dead-letters/:id/requeue')
  @HttpCode(HttpStatus.OK)
  async requeue(@Param('id') id: string) {
    return { requeued: await this.outboxDeadLetters.requeue(id) };
  }

  @Delete('dead-letters/:id')
  async purge(@Param('id') id: string) {
    return { purged: await this.outboxDeadLetters.purge(id) };
  }

  @Get('stats')
  stats() {
    return this.outboxMetrics.snapshot();
  }
}
