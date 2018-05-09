import { Module } from '@nestjs/common';
import { CircularService } from './circular.service';
import { InputService } from './input.service';

@Module({
  providers: [CircularService, InputService],
})
export class CircularModule {}
