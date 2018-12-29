import { DynamicModule, Global, Module } from '@nestjs/common';
import { ValueProvider } from '@nestjs/common/interfaces';
import { requestProvider } from './../router/request/request-providers';
import { Reflector } from './../services';

@Global()
@Module({
  providers: [Reflector, requestProvider],
  exports: [Reflector, requestProvider],
})
export class InternalCoreModule {
  static register(providers: ValueProvider[]): DynamicModule {
    return {
      module: InternalCoreModule,
      providers: [...providers],
      exports: [...providers.map(item => item.provide)],
    };
  }
}
