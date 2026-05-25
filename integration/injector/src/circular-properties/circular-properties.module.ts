import { forwardRef, Module } from '@nestjs/common';
import { CircularService } from './circular.service.js';
import { InputPropertiesModule } from './input-properties.module.js';

@Module({
  imports: [forwardRef(() => InputPropertiesModule)],
  providers: [CircularService],
  exports: [CircularService],
})
export class CircularPropertiesModule {}
