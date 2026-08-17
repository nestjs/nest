import { Module } from '@nestjs/common';
import { DefaultsService } from './defaults.service.js';

@Module({
  providers: [DefaultsService],
})
export class DefaultsModule {}
