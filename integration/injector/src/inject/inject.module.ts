import { Module } from '@nestjs/common';
import { InjectService } from './inject.service';

@Module({
  providers: [InjectService],
})
export class InjectModule {}
