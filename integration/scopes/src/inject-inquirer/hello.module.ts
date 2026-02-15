import { Module, Logger } from '@nestjs/common';
import { HelloController } from './hello.controller.js';
import { HelloRequestService } from './hello-request/hello-request.service.js';
import { HelloTransientService } from './hello-transient/hello-transient.service.js';
import { RequestLogger } from './hello-request/request-logger.service.js';
import { TransientLogger } from './hello-transient/transient-logger.service.js';

@Module({
  controllers: [HelloController],
  providers: [
    HelloRequestService,
    HelloTransientService,
    RequestLogger,
    TransientLogger,
    Logger,
  ],
})
export class HelloModule {}
