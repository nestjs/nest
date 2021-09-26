import { ClientOptions, CustomClientOptions } from '../../interfaces';
import { Type, Provider, ModuleMetadata } from '@nestjs/common/interfaces';

export type ClientProvider = ClientOptions | CustomClientOptions;

export type ClientProviderOptions = ClientProvider & {
  name: string | symbol;
};

export type ClientsModuleOptions = Array<ClientProviderOptions>;

export interface ClientsModuleOptionsFactory {
  createClientOptions(): Promise<ClientProvider> | ClientProvider;
}

export interface ClientsProviderAsyncOptions
  extends Pick<ModuleMetadata, 'imports'> {
  useExisting?: Type<ClientsModuleOptionsFactory>;
  useClass?: Type<ClientsModuleOptionsFactory>;
  useFactory?: (...args: any[]) => Promise<ClientProvider> | ClientProvider;
  inject?: any[];
  extraProviders?: Provider[];
  name: string | symbol;
}

export type ClientsModuleAsyncOptions = Array<ClientsProviderAsyncOptions>;
