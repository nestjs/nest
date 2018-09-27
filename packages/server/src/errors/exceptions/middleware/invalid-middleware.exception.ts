import { RuntimeException } from '@nest/core';
import { INVALID_MIDDLEWARE_MESSAGE } from '../../messages';

export class InvalidMiddlewareException extends RuntimeException {
  constructor(name: string) {
    super(INVALID_MIDDLEWARE_MESSAGE(name));
  }
}
