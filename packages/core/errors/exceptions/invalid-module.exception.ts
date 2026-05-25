import { INVALID_MODULE_MESSAGE } from '../messages.js';
import { RuntimeException } from './runtime.exception.js';

export class InvalidModuleException extends RuntimeException {
  constructor(
    parentModule: any,
    index: number,
    scope: any[],
    receivedValue: unknown,
  ) {
    super(INVALID_MODULE_MESSAGE(parentModule, index, scope, receivedValue));
  }
}
