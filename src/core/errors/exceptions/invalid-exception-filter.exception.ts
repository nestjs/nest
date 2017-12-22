import { RuntimeException } from './runtime.exception';
import { INVALID_EXCEPTION_FILTER } from '../messages';

export class InvalidExceptionFilterException extends RuntimeException {
  constructor() {
    super(INVALID_EXCEPTION_FILTER);
  }
}
