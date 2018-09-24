import { RuntimeException } from './runtime.exception';
import { UNKNOWN_REQUEST_MAPPING } from '../messages';

export class UnknownRequestMappingException extends RuntimeException {
  constructor() {
    super(UNKNOWN_REQUEST_MAPPING);
  }
}
