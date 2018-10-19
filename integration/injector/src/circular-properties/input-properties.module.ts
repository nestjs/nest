import { forwardRef, Module } from '@nestjs/common';
import { CircularPropertiesModule } from './circular-properties.module';
import { InputService } from './input.service';

@Module({
  imports: [forwardRef(() => CircularPropertiesModule)],
  providers: [InputService],
  exports: [InputService],
})
export class InputPropertiesModule {}
