import { Injectable } from '@nestjs/common';
import { Order } from '../orders/entities/order.entity';

@Injectable()
export class OrdersService {

    public orders: Order[] = [
        {
            id: 1,
            name: 'order#1',
            description: 'description order#1'
        }, 
        {
            id: 2,
            name: 'order#2',
            description: 'description order#2'
        },
        {
            id: 3,
            name: 'order#3',
            description: 'description order#3'
        }  
    ];

    create(CreateOrderDto: any) {
        this.orders.push(CreateOrderDto);
        return CreateOrderDto;
      }
    
}
