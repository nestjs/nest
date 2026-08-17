import { Module } from '@nestjs/common';
import { GlobalService } from './global.module.js';
import { EagerService } from './eager.module.js';
import { TransientService } from './transient.service.js';

@Module({
  imports: [],
  providers: [TransientService, GlobalService, EagerService],
  exports: [TransientService],
})
export class TransientLazyModule {}
