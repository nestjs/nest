import { InjectionToken } from './injection-token.interface.js';

/**
 * @publicApi
 */
export type OptionalFactoryDependency = {
  token: InjectionToken;
  optional: boolean;
};
