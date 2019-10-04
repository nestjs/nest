import { DynamicModule, Module } from '@nestjs/common';
import { ClientProxyFactory } from '../client';
import { ClientsModuleOptions } from './interfaces/clients-module.interface';

@Module({})
export class ClientsModule {
  static register(options: ClientsModuleOptions): DynamicModule {
    const clients = (options || []).map(item => ({
      provide: item.name,
      useValue: ClientProxyFactory.create(item),
    }));
    return {
      module: ClientsModule,
      providers: clients,
      exports: clients,
    };
  }
}
