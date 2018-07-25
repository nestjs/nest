import { Module, forwardRef } from '@nestjs/common';
import { CircularService } from './circular.service';
import { InputModule } from './input.module';

@Module({
  imports: [forwardRef(() => InputModule)],
  providers: [CircularService],
  exports: [CircularService],
})
export class CircularModule {}
