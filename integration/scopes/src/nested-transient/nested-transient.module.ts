import { Module } from '@nestjs/common';
import { NestedTransientController } from './nested-transient.controller.js';
import { FirstRequestService } from './first-request.service.js';
import { SecondRequestService } from './second-request.service.js';
import { TransientLoggerService } from './transient-logger.service.js';
import { NestedTransientService } from './nested-transient.service.js';

@Module({
  controllers: [NestedTransientController],
  providers: [
    FirstRequestService,
    SecondRequestService,
    TransientLoggerService,
    NestedTransientService,
  ],
})
export class NestedTransientModule {}
