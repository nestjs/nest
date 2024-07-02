import { Module, DynamicModule } from '@nestjs/common';

@Module({})
export class MyDynamicModule {
  static register(dyanmicProviderValue: any): DynamicModule {
    return {
      module: MyDynamicModule,
      providers: [
        {
          provide: 'MyDynamicProvider',
          useValue: dyanmicProviderValue,
        },
      ],
      exports: ['MyDynamicProvider'],
    };
  }
}
