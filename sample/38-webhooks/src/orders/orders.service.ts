import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { Webhooks } from '@nestjs/webhooks';
import { and, eq, inArray } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import type { Database, Transaction } from '../database/drizzle.js';
import { orders, products } from '../database/schema.js';
import type { Partner } from '../partners/partner.guard.js';
import type { Order, OrderCancelled, OrderShipped } from './order.js';
import type { PlaceOrderDto } from './orders.dto.js';

@Injectable()
export class OrdersService {
  constructor(
    @InjectDrizzle() private readonly db: Database,
    private readonly webhooks: Webhooks<Transaction>,
  ) {}

  /** Places a partner's order, at the catalog's prices. */
  async placeOrder(partner: Partner, { items }: PlaceOrderDto): Promise<Order> {
    const catalog = await this.db
      .select()
      .from(products)
      .where(
        inArray(
          products.id,
          items.map(item => item.productId),
        ),
      );
    const lines = items.map(({ productId, quantity }) => {
      const product = catalog.find(row => row.id === productId);
      if (!product) {
        throw new BadRequestException(`Unknown product "${productId}"`);
      }
      return { productId, quantity, price: product.price };
    });
    const order: Order = {
      id: randomUUID(),
      partnerId: partner.id,
      items: lines,
      total: lines.reduce((sum, line) => sum + line.price * line.quantity, 0),
      status: 'placed',
      paymentId: null,
      trackingNumber: null,
    };
    await this.db.insert(orders).values(order);
    return order;
  }

  /** One of the partner's orders: another partner's order is a 404. */
  async getOrder(partner: Partner, id: string): Promise<Order> {
    const [row] = await this.db
      .select()
      .from(orders)
      .where(and(eq(orders.id, id), eq(orders.partnerId, partner.id)));
    if (!row) {
      throw new NotFoundException(`Order ${id} not found`);
    }
    return row;
  }

  /** Cancels an order that hasn't shipped, and tells the partner in the same transaction. */
  async cancelOrder(
    partner: Partner,
    id: string,
    reason: string,
  ): Promise<Order> {
    const order = await this.db.transaction(async tx => {
      const [row] = await tx
        .select()
        .from(orders)
        .where(and(eq(orders.id, id), eq(orders.partnerId, partner.id)))
        .for('update');
      if (!row) {
        throw new NotFoundException(`Order ${id} not found`);
      }
      if (row.status === 'shipped' || row.status === 'cancelled') {
        throw new ConflictException(`Order ${id} is ${row.status}`);
      }
      await tx
        .update(orders)
        .set({ status: 'cancelled' })
        .where(eq(orders.id, id));

      // Drizzle's tx: the webhook is sent only if the cancellation commits, and only to the
      // partner's own endpoints (the tenant).
      const data: OrderCancelled = { orderId: id, reason };
      await this.webhooks.dispatch(tx, {
        type: 'order.cancelled',
        tenant: row.partnerId,
        data,
      });
      return { ...row, status: 'cancelled' as const };
    });

    this.webhooks.notify(); // deliver now instead of at the next poll
    return order;
  }

  /** The payment provider confirmed the payment. Runs inside the receiver's transaction. */
  async markPaid(
    tx: Transaction,
    orderId: string,
    paymentId: string,
    amount: number,
  ): Promise<Order> {
    const [row] = await tx
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .for('update');
    if (!row) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }
    if (row.status !== 'placed') {
      throw new ConflictException(`Order ${orderId} is ${row.status}`);
    }
    if (amount !== row.total) {
      throw new ConflictException(
        `Payment ${paymentId} is for ${amount}, and order ${orderId} totals ${row.total}`,
      );
    }
    await tx
      .update(orders)
      .set({ status: 'paid', paymentId })
      .where(eq(orders.id, orderId));
    return { ...row, status: 'paid', paymentId };
  }

  /** The carrier picked the order up: marks it shipped and tells the partner, in one transaction (the carrier's webhook). */
  async markShipped(
    tx: Transaction,
    orderId: string,
    trackingNumber: string,
  ): Promise<Order> {
    const [row] = await tx
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .for('update');
    if (!row) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }
    if (row.status !== 'paid') {
      throw new ConflictException(
        `Order ${orderId} is ${row.status}, not paid`,
      );
    }
    await tx
      .update(orders)
      .set({ status: 'shipped', trackingNumber })
      .where(eq(orders.id, orderId));

    const data: OrderShipped = { orderId, trackingNumber };
    await this.webhooks.dispatch(tx, {
      type: 'order.shipped',
      tenant: row.partnerId,
      data,
    });
    return { ...row, status: 'shipped', trackingNumber };
  }
}
