import { RuntimeException } from './runtime.exception.js';
import { INVALID_EXCEPTION_FILTER } from '../messages.js';

export class InvalidExceptionFilterException extends RuntimeException {
  constructor() {
    super(INVALID_EXCEPTION_FILTER);
  }
}
