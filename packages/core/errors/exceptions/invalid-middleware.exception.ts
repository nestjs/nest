import { INVALID_MIDDLEWARE_MESSAGE } from '../messages.js';
import { RuntimeException } from './runtime.exception.js';

export class InvalidMiddlewareException extends RuntimeException {
  constructor(name: string) {
    super(INVALID_MIDDLEWARE_MESSAGE`${name}`);
  }
}
