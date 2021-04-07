import { UNDEFINED_MODULE_MESSAGE } from '../messages';

import { RuntimeException } from './runtime.exception';

export class UndefinedModuleException extends RuntimeException {
  constructor(parentModule: any, index: number, scope: any[]) {
    super(UNDEFINED_MODULE_MESSAGE(parentModule, index, scope));
  }
}
