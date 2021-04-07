import { DynamicModule, Module, Scope } from '@nestjs/common';

import { CatsResolvers } from './cats.resolvers';
import { CatsService } from './cats.service';
import { CatsRequestScopedService } from './cats-request-scoped.service';

@Module({
  providers: [CatsService, CatsResolvers],
})
export class CatsModule {
  static enableRequestScope(): DynamicModule {
    return {
      module: CatsModule,
      providers: [
        {
          provide: CatsService,
          useClass: CatsRequestScopedService,
          scope: Scope.REQUEST,
        },
      ],
    };
  }
}
