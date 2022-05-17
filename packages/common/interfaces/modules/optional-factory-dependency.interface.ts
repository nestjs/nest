import { InjectionToken } from './injection-token.interface';

export type OptionalFactoryDependency = {
  token: InjectionToken;
  optional: boolean;
};
