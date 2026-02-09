import { UNDEFINED_FORWARDREF_MESSAGE } from '../messages.js';
import { RuntimeException } from './runtime.exception.js';
import { Type } from '@nestjs/common';

export class UndefinedForwardRefException extends RuntimeException {
  constructor(scope: Type<any>[]) {
    super(UNDEFINED_FORWARDREF_MESSAGE(scope));
  }
}
