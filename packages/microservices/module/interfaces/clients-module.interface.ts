import { ClientOptions } from '../../interfaces';

export type ClientProviderOptions = ClientOptions & {
  name: string;
};

export interface ClientsModuleOptions extends Array<ClientProviderOptions> {}
