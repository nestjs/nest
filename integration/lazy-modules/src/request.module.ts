import { Module } from '@nestjs/common';
import { EagerService } from './eager.module.js';
import { GlobalService } from './global.module.js';
import { RequestService } from './request.service.js';

@Module({
  imports: [],
  providers: [RequestService, GlobalService, EagerService],
  exports: [RequestService],
})
export class RequestLazyModule {}
