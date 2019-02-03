import { Module } from '@nestjs/common';

@Module({
  providers: [{
    provide: 'TEST',
    useFactory: () => 'a',
    multi: true,
  },
  {
    provide: 'B_VALUE',
    useValue: 'b',
  },
  {
    provide: 'TEST',
    useFactory: (b) => b,
    inject: ['B_VALUE'],
    multi: true,
  }],
})
export class MultiProviderUseFactoryModule { }
