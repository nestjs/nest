import { ClientOptions } from '../../interfaces';

export type ClientProviderOptions = ClientOptions & {
  name: string;
};

export type ClientsModuleOptions = Array<ClientProviderOptions>;
