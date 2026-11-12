import { REQUEST_SCOPED_CREATE_MESSAGE } from '../messages';
import { RuntimeException } from './runtime.exception';

export class RequestScopedCreateException extends RuntimeException {
  constructor(name: string) {
    super(REQUEST_SCOPED_CREATE_MESSAGE(name));
  }
}
