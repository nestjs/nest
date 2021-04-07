import { Provider, Scope } from '@nestjs/common';

import { INQUIRER } from './inquirer-constants';

// eslint-disable-next-line @typescript-eslint/no-empty-function
const noop = () => {};
export const inquirerProvider: Provider = {
  provide: INQUIRER,
  scope: Scope.TRANSIENT,
  useFactory: noop,
};
