import { ClientOptions } from '../../interfaces';
import { Type, Provider, ModuleMetadata } from '@nestjs/common/interfaces';

export type ClientProviderOptions = ClientOptions & {
  name: string | symbol;
};

export type ClientsModuleOptions = Array<ClientProviderOptions>;

export interface ClientsModuleOptionsFactory {
  createClientOptions(): Promise<ClientOptions> | ClientOptions;
}

export interface ClientsProviderAsyncOptions
  extends Pick<ModuleMetadata, 'imports'> {
  useExisting?: Type<ClientsModuleOptionsFactory>;
  useClass?: Type<ClientsModuleOptionsFactory>;
  useFactory?: (...args: any[]) => Promise<ClientOptions> | ClientOptions;
  inject?: any[];
  extraProviders?: Provider[];
  name: string | symbol;
}

export type ClientsModuleAsyncOptions = Array<ClientsProviderAsyncOptions>;
