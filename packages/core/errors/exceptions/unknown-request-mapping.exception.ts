import type { Type } from '@nestjs/common';
import { RuntimeException } from './runtime.exception';
import { UNKNOWN_REQUEST_MAPPING } from '../messages';

export class UnknownRequestMappingException extends RuntimeException {
  constructor(metatypeWrongPlaced: Type) {
    super(UNKNOWN_REQUEST_MAPPING(metatypeWrongPlaced));
  }
}
