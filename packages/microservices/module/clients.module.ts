import { DynamicModule, Module } from '@nestjs/common';
import { ClientProxyFactory } from 'client';
import { getClientToken } from './clients.utils';
import { ClientsModuleOptions } from './interfaces/clients-module.interface';

@Module({})
export class ClientsModule {
  static register(options: ClientsModuleOptions): DynamicModule {
    const clients = (options || []).map(item => ({
      provide: getClientToken(item.name),
      useValue: ClientProxyFactory.create(item.options),
    }));
    return {
      module: ClientsModule,
      providers: clients,
      exports: clients,
    };
  }
}
