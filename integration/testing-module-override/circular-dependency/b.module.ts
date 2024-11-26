import { Injectable, Module, forwardRef } from '@nestjs/common';
import { AModule } from './a.module';

@Injectable()
export class BProvider {}

@Module({
  imports: [forwardRef(() => AModule)],
  providers: [BProvider],
  exports: [BProvider],
})
export class BModule {}
