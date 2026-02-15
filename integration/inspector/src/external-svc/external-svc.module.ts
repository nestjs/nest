import { Module } from '@nestjs/common';
import { ExternalSvcService } from './external-svc.service.js';
import { ExternalSvcController } from './external-svc.controller.js';

@Module({
  controllers: [ExternalSvcController],
  providers: [ExternalSvcService],
})
export class ExternalSvcModule {}
