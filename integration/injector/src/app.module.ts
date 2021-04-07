import { Module } from '@nestjs/common';

import { ExportsModule } from './exports/exports.module';

@Module({
  imports: [ExportsModule],
})
export class ApplicationModule {}
