import { RuntimeException } from './runtime.exception';
import { INVALID_MIDDLEWARE_CONFIGURATION } from '../messages';

export class InvalidMiddlewareConfigurationException extends RuntimeException {
  constructor(reason?: string) {
    super(
      reason
        ? `${INVALID_MIDDLEWARE_CONFIGURATION} ${reason}`
        : INVALID_MIDDLEWARE_CONFIGURATION,
    );
  }
}
