import { Logger,Module } from '@nestjs/common';

import { HelloRequestService } from './hello-request/hello-request.service';
import { RequestLogger } from './hello-request/request-logger.service';
import { HelloTransientService } from './hello-transient/hello-transient.service';
import { TransientLogger } from './hello-transient/transient-logger.service';
import { HelloController } from './hello.controller';

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
