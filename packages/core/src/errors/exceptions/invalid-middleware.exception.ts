import { INVALID_MIDDLEWARE_MESSAGE } from '../messages';
import { RuntimeException } from './runtime.exception';

export class InvalidMiddlewareException extends RuntimeException {
  constructor(name: string) {
    super(INVALID_MIDDLEWARE_MESSAGE`${name}`);
  }
}
