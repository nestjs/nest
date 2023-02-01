import { Module } from '@nestjs/common';
import { ExternalSvcService } from './external-svc.service';
import { ExternalSvcController } from './external-svc.controller';

@Module({
  controllers: [ExternalSvcController],
  providers: [ExternalSvcService],
})
export class ExternalSvcModule {}
