import { Module } from '@nestjs/common';
import { ScopedController } from './scoped.controller';
import { ScopedService } from './scoped.service';
import { TransientService } from './transient.service';

@Module({
  controllers: [ScopedController],
  providers: [ScopedService, TransientService],
})
export class ScopedModule {}
