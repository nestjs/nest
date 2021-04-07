import { Module } from '@nestjs/common';

import { ExportsService } from './exports.service';

@Module({
  exports: [ExportsService],
})
export class ExportsModule {}
