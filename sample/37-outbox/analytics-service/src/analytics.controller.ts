import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import type { OutboxEnvelope } from '@nestjs/outbox';
import {
  OrderStatsService,
  type OrderEvent,
  type OrderSnapshot,
} from './order-stats.service.js';

@Controller()
export class AnalyticsController {
  private readonly logger = new Logger(AnalyticsController.name);
  /** The last event handled for each key: one order's events run one at a time. */
  private readonly queues = new Map<string, Promise<void>>();

  constructor(private readonly orderStatsService: OrderStatsService) {}

  @EventPattern('analytics.order.placed')
  onPlaced(@Payload() envelope: OutboxEnvelope<OrderSnapshot>) {
    return this.apply('placed', envelope);
  }

  @EventPattern('analytics.order.cancelled')
  onCancelled(@Payload() envelope: OutboxEnvelope<OrderSnapshot>) {
    return this.apply('cancelled', envelope);
  }

  private apply(event: OrderEvent, envelope: OutboxEnvelope<OrderSnapshot>) {
    // Events arrive in the order the relay published them, but handlers are asynchronous:
    // without a queue, a cancellation could commit before the placement it follows.
    return this.inOrder(envelope.key ?? envelope.id, async () => {
      // The envelope id is the outbox message id: stable across redeliveries.
      const recorded = await this.orderStatsService.record(
        envelope.id,
        event,
        envelope.payload,
      );
      if (!recorded)
        this.logger.warn(`Skipped duplicate ${envelope.topic} ${envelope.id}`);
    });
  }

  private inOrder(key: string, work: () => Promise<void>): Promise<void> {
    const next = (this.queues.get(key) ?? Promise.resolve()).then(work, work);
    this.queues.set(key, next);
    const forget = () => {
      if (this.queues.get(key) === next) this.queues.delete(key);
    };
    next.then(forget, forget);
    return next;
  }
}
