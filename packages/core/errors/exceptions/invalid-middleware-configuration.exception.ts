import { RuntimeException } from './runtime.exception';
import { INVALID_MIDDLEWARE_CONFIGURATION } from '../messages';

export class InvalidMiddlewareConfigurationException extends RuntimeException {
  constructor() {
    super(INVALID_MIDDLEWARE_CONFIGURATION);
  }
}
