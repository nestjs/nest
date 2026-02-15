import { Module, forwardRef } from '@nestjs/common';
import { CircularModule } from './circular.module.js';
import { InputService } from './input.service.js';

@Module({
  imports: [forwardRef(() => CircularModule)],
  providers: [InputService],
  exports: [InputService],
})
export class InputModule {}
