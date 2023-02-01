import { InjectionToken } from './injection-token.interface';

/**
 * @publicApi
 */
export type OptionalFactoryDependency = {
  token: InjectionToken;
  optional: boolean;
};
