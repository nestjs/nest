import { Injectable } from '@nestjs/common';
import { CreateOrderDto } from '../dto/create-order.dto';

@Injectable()
export class OrderCreatedEvent {

    constructor(createOrderDto: CreateOrderDto) {
        console.log(createOrderDto);
        console.log('You have new order');
    }
}
