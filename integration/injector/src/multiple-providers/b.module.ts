import { Module, Scope } from '@nestjs/common';

@Module({
  providers: [
    {
      provide: 'MULTI_PROVIDER',
      useValue: 'B',
    },
    {
      provide: 'REQ_SCOPED_MULTI_PROVIDER',
      useFactory: () => 'B',
      scope: Scope.REQUEST,
    },
  ],
})
export class BModule {}
