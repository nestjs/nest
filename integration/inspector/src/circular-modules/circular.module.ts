import { Module, forwardRef } from '@nestjs/common';
import { CircularService } from './circular.service.js';
import { InputModule } from './input.module.js';

@Module({
  imports: [forwardRef(() => InputModule)],
  providers: [CircularService],
  exports: [CircularService],
})
export class CircularModule {}
