import { Injectable } from '@nestjs/common';
import { Order } from './order.entity.js';
import { TypeOrmTransactionAdapter } from './typeorm-transaction.adapter.js';

@Injectable()
export class OrdersRepository {
  constructor(private readonly adapter: TypeOrmTransactionAdapter) {}

  // Note there is no transaction parameter here — the adapter resolves the
  // active transaction (if any) via its own AsyncLocalStorage.
  insert(sku: string): Promise<Order> {
    return this.adapter.getManager().save(Order, { sku });
  }

  findAll(): Promise<Order[]> {
    return this.adapter.getManager().find(Order);
  }
}
