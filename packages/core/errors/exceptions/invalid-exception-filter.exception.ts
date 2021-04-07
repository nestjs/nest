import { INVALID_EXCEPTION_FILTER } from '../messages';

import { RuntimeException } from './runtime.exception';

export class InvalidExceptionFilterException extends RuntimeException {
  constructor() {
    super(INVALID_EXCEPTION_FILTER);
  }
}
