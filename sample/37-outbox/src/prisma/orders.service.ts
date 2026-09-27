import { BadRequestException, Injectable } from '@nestjs/common';
import { Outbox } from '@nestjs/outbox';
import { randomUUID } from 'node:crypto';
import type { Order, PlaceOrderDto } from '../orders/order.js';
import { PrismaService, type Transaction } from './prisma.service.js';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly outbox: Outbox<Transaction>,
  ) {}

  async placeOrder({ userId, items }: PlaceOrderDto): Promise<Order> {
    if (!items?.length)
      throw new BadRequestException('An order needs at least one item');

    const order = await this.prismaService.$transaction(async tx => {
      const products = await tx.product.findMany({
        where: { id: { in: items.map(item => item.productId) } },
      });
      const lines = items.map(({ productId, quantity }) => {
        const product = products.find(row => row.id === productId);
        if (!product)
          throw new BadRequestException(`Unknown product "${productId}"`);
        if (!Number.isInteger(quantity) || quantity < 1) {
          throw new BadRequestException(`Invalid quantity for "${productId}"`);
        }
        return { productId, quantity, price: product.price };
      });
      const order: Order = {
        id: randomUUID(),
        userId,
        items: lines,
        total: lines.reduce((sum, line) => sum + line.price * line.quantity, 0),
        status: 'placed',
      };
      await tx.order.create({
        data: { ...order, items: order.items as object[] },
      });

      // The interactive transaction's client: the message commits or rolls back with the order.
      await this.outbox.add(tx, { topic: 'order.placed', payload: order });
      return order;
    });

    this.outbox.notify(); // publish now instead of at the next poll
    return order;
  }
}
