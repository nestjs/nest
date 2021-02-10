import { Module } from '@nestjs/common';
import { OrderCreatedListener } from './listeners/order-created.listener';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  controllers: [OrdersController],
  providers: [OrdersService, OrderCreatedListener],
})
export class OrdersModule {}
