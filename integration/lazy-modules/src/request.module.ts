import { Module } from '@nestjs/common';
import { EagerService } from './eager.module';
import { GlobalService } from './global.module';
import { RequestService } from './request.service';

@Module({
  imports: [],
  providers: [RequestService, GlobalService, EagerService],
  exports: [RequestService],
})
export class RequestLazyModule {}
