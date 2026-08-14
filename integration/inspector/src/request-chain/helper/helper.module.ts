import { Module } from '@nestjs/common';
import { HelperService } from './helper.service.js';

@Module({
  providers: [HelperService],
  exports: [HelperService],
})
export class HelperModule {}
