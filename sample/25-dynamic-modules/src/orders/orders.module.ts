import { Module } from '@nestjs/common';
import { IdGeneratorModule } from '../id-generator/id-generator.module.js';
import { OrdersController } from './orders.controller.js';
import { OrdersService } from './orders.service.js';

@Module({
  imports: [IdGeneratorModule.register({ prefix: 'ord' })],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
