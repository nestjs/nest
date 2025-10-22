import { Module } from '@nestjs/common';
import { NestedTransientController } from './nested-transient.controller';
import { FirstRequestService } from './first-request.service';
import { SecondRequestService } from './second-request.service';
import { TransientLoggerService } from './transient-logger.service';
import { NestedTransientService } from './nested-transient.service';

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
