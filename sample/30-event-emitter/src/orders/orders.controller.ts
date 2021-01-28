import { Body, Controller, Get, Post } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OrdersService } from './orders.service';
import { OrderCreatedEvent } from "./events/order-created.event";
import { CreateOrderDto } from './dto/create-order.dto';

@Controller('orders')
export class OrdersController {
    constructor(
        private ordersService: OrdersService,
        private eventEmitter: EventEmitter2
    ) {}

    @Get()
    findAll() {
        return this.ordersService.orders;
    }

    @Post()
    create(@Body() createOrderDto: CreateOrderDto) {
        this.eventEmitter.emit(
            'order.created',
            new OrderCreatedEvent(createOrderDto)
        );
      
        return this.ordersService.create(createOrderDto);
    }
}
  