import { ClientOptions, CustomClientOptions } from '../../interfaces';
import { Type, Provider, ModuleMetadata } from '@nestjs/common/interfaces';

export type ClientProvider<ClientProviderCustomOptions = {}> =
  | ClientOptions<ClientProviderCustomOptions>
  | CustomClientOptions;

export type ClientProviderOptions<ClientProviderCustomOptions> =
  ClientProvider<ClientProviderCustomOptions> & {
    name: string | symbol;
  };

export type ClientsModuleOptions<ClientProviderCustomOptions = {}> =
  | Array<ClientProviderOptions<ClientProviderCustomOptions>>
  | {
      clients: Array<ClientProviderOptions<ClientProviderCustomOptions>>;
      isGlobal?: boolean;
    };

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

export type ClientsModuleAsyncOptions =
  | Array<ClientsProviderAsyncOptions>
  | {
      clients: Array<ClientsProviderAsyncOptions>;
      isGlobal?: boolean;
    };
