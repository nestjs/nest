import { Module } from '@nestjs/common';
import { InjectService } from './inject.service.js';

@Module({
  providers: [InjectService],
})
export class InjectModule {}
