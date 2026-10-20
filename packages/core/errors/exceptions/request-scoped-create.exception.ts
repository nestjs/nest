import { REQUEST_SCOPED_CREATE_MESSAGE } from '../messages.js';
import { RuntimeException } from './runtime.exception.js';

export class RequestScopedCreateException extends RuntimeException {
  constructor(name: string) {
    super(REQUEST_SCOPED_CREATE_MESSAGE(name));
  }
}
