import { Provider, Scope } from '@nestjs/common';
import { INQUIRER } from './inquirer-constants';

const noop = () => {};
export const inquirerProvider: Provider = {
  provide: INQUIRER,
  scope: Scope.TRANSIENT,
  useFactory: noop,
};
