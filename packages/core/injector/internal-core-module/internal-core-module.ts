import { type DynamicModule, Global, Module } from '@nestjs/common';
import { requestProvider } from '../../router/request/request-providers.js';
import { Reflector } from '../../services/index.js';
import { inquirerProvider } from '../inquirer/inquirer-providers.js';
import type {
  ExistingProvider,
  FactoryProvider,
  ValueProvider,
} from '@nestjs/common';

const ReflectorAliasProvider = {
  provide: Reflector.name,
  useExisting: Reflector,
};

@Global()
@Module({
  providers: [
    Reflector,
    ReflectorAliasProvider,
    requestProvider,
    inquirerProvider,
  ],
  exports: [
    Reflector,
    ReflectorAliasProvider,
    requestProvider,
    inquirerProvider,
  ],
})
export class InternalCoreModule {
  static register(
    providers: Array<ValueProvider | FactoryProvider | ExistingProvider>,
  ): DynamicModule {
    return {
      module: InternalCoreModule,
      providers: [...providers],
      exports: [...providers.map(item => item.provide)],
    };
  }
}
