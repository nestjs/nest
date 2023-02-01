import { Module } from '@nestjs/common';
import { DurableController } from './durable.controller';
import { DurableService } from './durable.service';

@Module({
  controllers: [DurableController],
  providers: [DurableService],
})
export class DurableModule {}
