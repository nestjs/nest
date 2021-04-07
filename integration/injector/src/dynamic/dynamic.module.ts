import { DynamicModule,Module } from '@nestjs/common';

export const DYNAMIC_TOKEN = 'DYNAMIC_TOKEN';
export const DYNAMIC_VALUE = {};

export const dynamicProvider = {
  provide: DYNAMIC_TOKEN,
  useValue: DYNAMIC_VALUE,
};

@Module({})
export class NestDynamicModule {
  static byObject(): DynamicModule {
    return {
      module: NestDynamicModule,
      providers: [dynamicProvider],
      exports: [dynamicProvider],
    };
  }

  static byName(): DynamicModule {
    return {
      module: NestDynamicModule,
      providers: [dynamicProvider],
      exports: [DYNAMIC_TOKEN],
    };
  }
}
