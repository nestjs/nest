import { RuntimeException } from '@nest/core';

import { INVALID_MIDDLEWARE_CONFIGURATION } from '../../messages';

export class UnknownRequestMappingException extends RuntimeException {
  constructor() {
    super(INVALID_MIDDLEWARE_CONFIGURATION);
  }
}
