import { Injectable } from '@nestjs/common';
import { IdGenerator } from '../id-generator/id-generator.js';

export interface Order {
  id: string;
  product: string;
}

@Injectable()
export class OrdersService {
  private readonly orders: Order[] = [];

  constructor(private readonly idGenerator: IdGenerator) {}

  create(product: string): Order {
    const order = { id: this.idGenerator.generate(), product };
    this.orders.push(order);
    return order;
  }

  findAll(): Order[] {
    return this.orders;
  }
}
