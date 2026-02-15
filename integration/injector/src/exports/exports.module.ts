import { Module } from '@nestjs/common';
import { ExportsService } from './exports.service.js';

@Module({
  exports: [ExportsService],
})
export class ExportsModule {}
