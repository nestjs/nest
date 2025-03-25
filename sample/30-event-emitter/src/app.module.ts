import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { OrdersModule } from './orders/orders.module';

@Module({
  imports: [EventEmitterModule.forRoot(), OrdersModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
