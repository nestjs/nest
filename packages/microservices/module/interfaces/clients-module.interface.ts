import { ClientOptions } from '../../interfaces';

export interface ClientProviderOptions {
  name: string;
  options: ClientOptions;
}

export interface ClientsModuleOptions extends Array<ClientProviderOptions> {}
