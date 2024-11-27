import { Provider, Scope } from '@nestjs/common';
import { REQUEST } from './request-constants';

const noop = () => {};
export const requestProvider: Provider = {
  provide: REQUEST,
  scope: Scope.REQUEST,
  useFactory: noop,
};
