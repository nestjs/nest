import { Module } from '@nestjs/common';
import { CircularService } from './circular.service.js';
import { InputService } from './input.service.js';

@Module({
  providers: [CircularService, InputService],
})
export class CircularModule {}
