import { Module, Scope } from '@nestjs/common';
import { ScopedController } from './scoped.controller';
import { ScopedService } from './scoped.service';
import { TransientService } from './transient.service';
import { Transient2Service } from './transient2.service';
import { Transient3Service } from './transient3.service';

export const STATIC_FACTORY = 'STATIC_FACTORY';
export const REQUEST_SCOPED_FACTORY = 'REQUEST_SCOPED_FACTORY';
export const TRANSIENT_SCOPED_FACTORY = 'TRANSIENT_SCOPED_FACTORY';

@Module({
  controllers: [ScopedController],
  providers: [
    ScopedService,
    TransientService,
    Transient2Service,
    Transient3Service,
    {
      provide: STATIC_FACTORY,
      useFactory: () => true,
    },
    {
      provide: REQUEST_SCOPED_FACTORY,
      useFactory: () => true,
      scope: Scope.REQUEST,
    },
    {
      provide: TRANSIENT_SCOPED_FACTORY,
      useFactory: () => true,
      scope: Scope.TRANSIENT,
    },
  ],
})
export class ScopedModule {}
