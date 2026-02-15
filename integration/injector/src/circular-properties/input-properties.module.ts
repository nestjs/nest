import { forwardRef, Module } from '@nestjs/common';
import { CircularPropertiesModule } from './circular-properties.module.js';
import { InputService } from './input.service.js';

@Module({
  imports: [forwardRef(() => CircularPropertiesModule)],
  providers: [InputService],
  exports: [InputService],
})
export class InputPropertiesModule {}
