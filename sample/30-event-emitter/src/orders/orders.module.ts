import { Module } from '@nestjs/common';
import { OrderCreatedListener } from './listeners/order-created.listener.js';
import { OrdersController } from './orders.controller.js';
import { OrdersService } from './orders.service.js';

@Module({
  controllers: [OrdersController],
  providers: [OrdersService, OrderCreatedListener],
})
export class OrdersModule {}
