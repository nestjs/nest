import { Injectable, Module, forwardRef } from '@nestjs/common';
import { BModule } from './b.module.js';

@Injectable()
export class AProvider {}

@Module({
  imports: [forwardRef(() => BModule)],
  providers: [AProvider],
  exports: [AProvider],
})
export class AModule {}
