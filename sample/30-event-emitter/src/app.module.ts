import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { OrdersModule } from './orders/orders.module';

@Module({
  imports: [EventEmitterModule.forRoot(), OrdersModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
