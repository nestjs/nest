import { DynamicModule, Global, Module } from '@nestjs/common';
import {
  ExistingProvider,
  FactoryProvider,
  ValueProvider,
} from '@nestjs/common/interfaces';
import { requestProvider } from '../../router/request/request-providers';
import { Reflector } from '../../services';
import { inquirerProvider } from '../inquirer/inquirer-providers';

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
