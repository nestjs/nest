import { Type } from '@nestjs/common';

import { UNDEFINED_FORWARDREF_MESSAGE } from '../messages';

import { RuntimeException } from './runtime.exception';

export class UndefinedForwardRefException extends RuntimeException {
  constructor(scope: Type<any>[]) {
    super(UNDEFINED_FORWARDREF_MESSAGE(scope));
  }
}
