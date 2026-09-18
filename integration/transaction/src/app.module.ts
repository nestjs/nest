import { Module } from '@nestjs/common';
import { TransactionModule } from '@nestjs/transaction';
import { OrdersModule } from './orders.module.js';
import { TypeOrmTransactionAdapter } from './typeorm-transaction.adapter.js';

@Module({
  imports: [
    OrdersModule,
    TransactionModule.forRootAsync({
      imports: [OrdersModule],
      useExisting: TypeOrmTransactionAdapter,
    }),
  ],
})
export class AppModule {}
