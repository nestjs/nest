import { Module } from '@nestjs/common';
import { InvoicesService } from '../invoices/invoices.service.js';
import { OrdersController } from './orders.controller.js';
import { OrdersService } from './orders.service.js';

@Module({
  controllers: [OrdersController],
  providers: [OrdersService, InvoicesService],
})
export class OrdersModule {}
