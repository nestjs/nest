import { RuntimeException } from './runtime.exception';
import { UNDEFINED_MODULE_MESSAGE } from '../messages';

export class UndefinedModuleException extends RuntimeException {
  constructor(parentModule: any, index: number, scope: any[]) {
    super(UNDEFINED_MODULE_MESSAGE(parentModule, index, scope));
  }
}
