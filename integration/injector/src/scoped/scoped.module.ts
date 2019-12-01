import { Module } from '@nestjs/common';
import { ScopedController } from './scoped.controller';
import { ScopedService } from './scoped.service';
import { TransientService } from './transient.service';
import { Transient2Service } from './transient2.service';

@Module({
  controllers: [ScopedController],
  providers: [ScopedService, TransientService, Transient2Service],
})
export class ScopedModule {}
