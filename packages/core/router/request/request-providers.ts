import { Provider, Scope } from '@nestjs/common';
import { REQUEST, RESPONSE } from './request-constants';

// eslint-disable-next-line @typescript-eslint/no-empty-function
const noop = () => {};
export const requestProvider: Provider = {
  provide: REQUEST,
  scope: Scope.REQUEST,
  useFactory: noop,
};

export const responseProvider: Provider = {
  provide: RESPONSE,
  scope: Scope.REQUEST,
  useFactory: noop,
};
