import { OnEvent } from '@nestjs/event-emitter';
import { OrderCreatedEvent } from '../events/order-created.event';

export class OrderCreatedListener {
  @OnEvent('order.created')
  handleOrderCreatedEvent(event: OrderCreatedEvent) {
    // handle and process "OrderCreatedEvent" event
    console.log(event);
  }
}
