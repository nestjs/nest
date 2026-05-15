import { Module } from '@nestjs/common';
import { ExportsModule } from './exports/exports.module.js';

@Module({
  imports: [ExportsModule],
})
export class ApplicationModule {}
