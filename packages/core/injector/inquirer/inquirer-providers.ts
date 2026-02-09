import { Provider, Scope } from '@nestjs/common';
import { INQUIRER } from './inquirer-constants.js';

const noop = () => {};
export const inquirerProvider: Provider = {
  provide: INQUIRER,
  scope: Scope.TRANSIENT,
  useFactory: noop,
};
