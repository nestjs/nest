import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { DurableZooModule } from './durable-cross-module.modules.js';
import { DurableController } from './durable.controller.js';
import {
  DurableCatsService,
  DurableDogsService,
} from './durable-forward-ref.services.js';
import { DurableFilter } from './durable.filter.js';
import { DurableGuard } from './durable.guard.js';
import { DurableService } from './durable.service.js';
import { NonDurableService } from './non-durable.service.js';

@Module({
  imports: [DurableZooModule],
  controllers: [DurableController],
  providers: [
    DurableService,
    NonDurableService,
    DurableCatsService,
    DurableDogsService,
    {
      provide: APP_GUARD,
      useClass: DurableGuard,
    },
    {
      provide: APP_FILTER,
      useClass: DurableFilter,
    },
  ],
})
export class DurableModule {}
