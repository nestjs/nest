import { Module } from '@nestjs/common';
import { DurableController } from './durable.controller.js';
import { DurableService } from './durable.service.js';

@Module({
  controllers: [DurableController],
  providers: [DurableService],
})
export class DurableModule {}
