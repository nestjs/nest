import { Injectable, Logger } from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import {
  NonRetryableMessageError,
  OnOutboxMessage,
  type OutboxHandlerContext,
} from '@nestjs/outbox';
import { and, eq, gte, sql } from 'drizzle-orm';
import type { Database, Transaction } from '../database/drizzle.js';
import { products } from '../database/schema.js';
import type { Order } from '../orders/order.js';

@Injectable()
export class StockReservationHandler {
  private readonly logger = new Logger(StockReservationHandler.name);

  constructor(@InjectDrizzle() private readonly db: Database) {}

  @OnOutboxMessage('order.placed', { consumer: 'stock-reservation' })
  async reserve(order: Order, ctx: OutboxHandlerContext<Transaction>) {
    await this.db.transaction(async tx => {
      // Records the message id through tx, then runs the callback only if this consumer
      // hasn't processed it yet. Await it: the record commits with the reservation.
      await ctx.processInTransaction(tx, async () => {
        for (const { productId, quantity } of order.items) {
          const reserved = await tx
            .update(products)
            .set({
              inStock: sql`${products.inStock} - ${quantity}`,
              reserved: sql`${products.reserved} + ${quantity}`,
            })
            .where(
              and(eq(products.id, productId), gte(products.inStock, quantity)),
            )
            .returning({ id: products.id });
          if (reserved.length === 0) {
            // Retrying won't create stock: dead-letter it now and let a human decide.
            throw new NonRetryableMessageError(
              `Not enough stock for "${productId}" (order ${order.id})`,
            );
          }
        }
        this.logger.log(`Reserved stock for order ${order.id}`);
      });
    });
  }
}
