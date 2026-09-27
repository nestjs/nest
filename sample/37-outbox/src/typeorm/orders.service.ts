import { BadRequestException, Injectable } from '@nestjs/common';
import { Outbox } from '@nestjs/outbox';
import { randomUUID } from 'node:crypto';
import { DataSource, In, type EntityManager } from 'typeorm';
import type { Order, PlaceOrderDto } from '../orders/order.js';
import { OrderEntity } from './order.entity.js';
import { ProductEntity } from './product.entity.js';

@Injectable()
export class OrdersService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly outbox: Outbox<EntityManager>,
  ) {}

  async placeOrder({ userId, items }: PlaceOrderDto): Promise<Order> {
    if (!items?.length)
      throw new BadRequestException('An order needs at least one item');

    const order = await this.dataSource.transaction(async manager => {
      const products = await manager.findBy(ProductEntity, {
        id: In(items.map(item => item.productId)),
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
      await manager.insert(OrderEntity, order);

      // The transaction's EntityManager: the message commits or rolls back with the order.
      await this.outbox.add(manager, { topic: 'order.placed', payload: order });
      return order;
    });

    this.outbox.notify(); // publish now instead of at the next poll
    return order;
  }
}
