import { Injectable } from '@nestjs/common';
import { Transactional } from '@nestjs/transaction';
import { Order } from './order.entity.js';
import { OrdersRepository } from './orders.repository.js';

@Injectable()
export class OrderService {
  constructor(private readonly orders: OrdersRepository) {}

  /**
   * Inserts two rows in one transaction. If the second insert violates the
   * unique constraint on `sku`, the whole transaction — including the first,
   * otherwise-successful insert — must roll back.
   */
  @Transactional()
  async createOrderPair(skuA: string, skuB: string): Promise<void> {
    await this.orders.insert(skuA);
    await this.orders.insert(skuB);
  }

  findAll(): Promise<Order[]> {
    return this.orders.findAll();
  }
}
