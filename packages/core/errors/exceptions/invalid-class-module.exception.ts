import { USING_INVALID_CLASS_AS_A_MODULE_MESSAGE } from '../messages.js';
import { RuntimeException } from './runtime.exception.js';

export class InvalidClassModuleException extends RuntimeException {
  constructor(metatypeUsedAsAModule: any, scope: any[]) {
    super(
      USING_INVALID_CLASS_AS_A_MODULE_MESSAGE(metatypeUsedAsAModule, scope),
    );
  }
}
