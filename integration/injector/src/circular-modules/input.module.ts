import { forwardRef,Module } from '@nestjs/common';

import { CircularModule } from './circular.module';
import { InputService } from './input.service';

@Module({
  imports: [forwardRef(() => CircularModule)],
  providers: [InputService],
  exports: [InputService],
})
export class InputModule {}
