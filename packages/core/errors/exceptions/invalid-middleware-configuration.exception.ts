import { RuntimeException } from './runtime.exception.js';
import { INVALID_MIDDLEWARE_CONFIGURATION } from '../messages.js';

export class InvalidMiddlewareConfigurationException extends RuntimeException {
  constructor(reason?: string) {
    super(
      reason
        ? `${INVALID_MIDDLEWARE_CONFIGURATION} ${reason}`
        : INVALID_MIDDLEWARE_CONFIGURATION,
    );
  }
}
