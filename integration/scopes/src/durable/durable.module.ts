import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { DurableController } from './durable.controller';
import { DurableGuard } from './durable.guard';
import { DurableService } from './durable.service';
import { NonDurableService } from './non-durable.service';

@Module({
  controllers: [DurableController],
  providers: [
    DurableService,
    NonDurableService,
    {
      provide: APP_GUARD,
      useClass: DurableGuard,
    },
  ],
})
export class DurableModule {}
