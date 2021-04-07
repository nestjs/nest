import { INVALID_MIDDLEWARE_CONFIGURATION } from '../messages';

import { RuntimeException } from './runtime.exception';

export class InvalidMiddlewareConfigurationException extends RuntimeException {
  constructor() {
    super(INVALID_MIDDLEWARE_CONFIGURATION);
  }
}
