import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Order } from '../orders/entities/order.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderCreatedEvent } from './events/order-created.event';

@Injectable()
export class OrdersService {
  public orders: Order[] = [
    {
      id: 1,
      name: 'Order #1',
      description: 'Description order #1',
    },
    {
      id: 2,
      name: 'Order #2',
      description: 'Description order #2',
    },
  ];

  constructor(private eventEmitter: EventEmitter2) {}

  create(createOrderDto: CreateOrderDto) {
    const order = {
      id: this.orders.length + 1,
      ...createOrderDto,
    };
    this.orders.push(order);

    const orderCreatedEvent = new OrderCreatedEvent();
    orderCreatedEvent.name = order.name;
    orderCreatedEvent.description = order.description;
    this.eventEmitter.emit('order.created', orderCreatedEvent);

    return order;
  }
}
