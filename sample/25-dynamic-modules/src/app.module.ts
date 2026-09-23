import { Module } from '@nestjs/common';
import { OrdersModule } from './orders/orders.module.js';
import { UsersModule } from './users/users.module.js';

@Module({
  imports: [UsersModule, OrdersModule],
})
export class AppModule {}
