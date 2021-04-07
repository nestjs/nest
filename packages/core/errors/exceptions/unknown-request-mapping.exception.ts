import { UNKNOWN_REQUEST_MAPPING } from '../messages';

import { RuntimeException } from './runtime.exception';

export class UnknownRequestMappingException extends RuntimeException {
  constructor() {
    super(UNKNOWN_REQUEST_MAPPING);
  }
}
