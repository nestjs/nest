import { Module } from '@nestjs/common';
import { DataSourceModule } from './data-source.module.js';
import { OrderService } from './order.service.js';
import { OrdersRepository } from './orders.repository.js';
import { TypeOrmTransactionAdapter } from './typeorm-transaction.adapter.js';

@Module({
  imports: [DataSourceModule],
  providers: [TypeOrmTransactionAdapter, OrdersRepository, OrderService],
  exports: [TypeOrmTransactionAdapter, OrderService],
})
export class OrdersModule {}
