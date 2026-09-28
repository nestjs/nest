import { Injectable, Logger } from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { OutboxInbox } from '@nestjs/outbox';
import { asc, eq, sql } from 'drizzle-orm';
import type { Database, Transaction } from './database/drizzle.js';
import { orderEvents } from './database/schema.js';

/** The fields of the order API's `Order` that this service reads. */
export interface OrderSnapshot {
  id: string;
  total: number;
}

export type OrderEvent = 'placed' | 'cancelled';

@Injectable()
export class OrderStatsService {
  private readonly logger = new Logger(OrderStatsService.name);

  constructor(
    @InjectDrizzle() private readonly db: Database,
    private readonly outboxInbox: OutboxInbox,
  ) {}

  /**
   * Records an order event once per message id. The inbox record and the event commit in
   * one transaction, so a redelivered message changes nothing. `false` for a duplicate.
   */
  async record(
    messageId: string,
    event: OrderEvent,
    order: OrderSnapshot,
  ): Promise<boolean> {
    const outcome = await this.db.transaction(async tx =>
      // Records the message id through tx, then runs the callback only if it is new here.
      this.outboxInbox.processInTransaction(
        tx,
        'analytics',
        messageId,
        async () => {
          const amount = event === 'placed' ? order.total : -order.total;
          await tx
            .insert(orderEvents)
            .values({ orderId: order.id, event, amount });
          return this.revenue(tx);
        },
      ),
    );
    if (outcome.duplicate) return false;
    this.logger.log(
      `Order ${order.id} ${event}, revenue is now ${outcome.result}`,
    );
    return true;
  }

  /** Total revenue in cents. */
  async revenue(db: Database | Transaction = this.db): Promise<number> {
    const [row] = await db
      .select({
        total: sql<number>`coalesce(sum(${orderEvents.amount}), 0)`.mapWith(
          Number,
        ),
      })
      .from(orderEvents);
    return row!.total;
  }

  /** An order's events, in the order they were recorded. */
  async timeline(orderId: string): Promise<OrderEvent[]> {
    const rows = await this.db
      .select({ event: orderEvents.event })
      .from(orderEvents)
      .where(eq(orderEvents.orderId, orderId))
      .orderBy(asc(orderEvents.seq));
    return rows.map(row => row.event);
  }
}
