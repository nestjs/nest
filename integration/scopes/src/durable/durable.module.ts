import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { DurableController } from './durable.controller.js';
import { DurableGuard } from './durable.guard.js';
import { DurableService } from './durable.service.js';
import { NonDurableService } from './non-durable.service.js';

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
