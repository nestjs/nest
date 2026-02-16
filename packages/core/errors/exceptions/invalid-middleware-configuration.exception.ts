import { RuntimeException } from './runtime.exception.js';
import { INVALID_MIDDLEWARE_CONFIGURATION } from '../messages.js';

export class InvalidMiddlewareConfigurationException extends RuntimeException {
  constructor() {
    super(INVALID_MIDDLEWARE_CONFIGURATION);
  }
}
