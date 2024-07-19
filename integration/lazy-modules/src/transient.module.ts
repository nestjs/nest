import { Module } from '@nestjs/common';
import { GlobalService } from './global.module';
import { EagerService } from './eager.module';
import { TransientService } from './transient.service';

@Module({
  imports: [],
  providers: [TransientService, GlobalService, EagerService],
  exports: [TransientService],
})
export class TransientLazyModule {}
