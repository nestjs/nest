import { Body, Controller, Get, Post } from '@nestjs/common';
import { Order, OrdersService } from './orders.service.js';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  create(@Body('product') product: string): Order {
    return this.ordersService.create(product);
  }

  @Get()
  findAll(): Order[] {
    return this.ordersService.findAll();
  }
}
