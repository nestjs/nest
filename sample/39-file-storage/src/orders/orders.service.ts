import { Injectable, NotFoundException } from '@nestjs/common';
import type { Order } from './order.interface.js';

/** The store's orders, in memory: `ord_1000` has been paid, `ord_1001` hasn't. */
@Injectable()
export class OrdersService {
  private readonly orders = new Map<string, Order>([
    [
      'ord_1000',
      {
        id: 'ord_1000',
        status: 'paid',
        items: [
          {
            productId: 'salmon-kibble-2kg',
            name: 'Salmon kibble, 2 kg',
            price: 2499,
            quantity: 2,
          },
        ],
        total: 4998,
      },
    ],
    [
      'ord_1001',
      {
        id: 'ord_1001',
        status: 'pending',
        items: [
          {
            productId: 'sisal-scratching-post',
            name: 'Sisal scratching post',
            price: 3999,
            quantity: 1,
          },
        ],
        total: 3999,
      },
    ],
  ]);

  findOne(id: string): Order {
    const order = this.orders.get(id);
    if (!order) {
      throw new NotFoundException(`Order ${id} not found`);
    }
    return order;
  }
}
