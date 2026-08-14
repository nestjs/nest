import { INVALID_CLASS_SCOPE_MESSAGE } from '../messages.js';
import { RuntimeException } from './runtime.exception.js';
import type { Abstract, Type } from '@nestjs/common';
import { isFunction } from '@nestjs/common/internal';

export class InvalidClassScopeException extends RuntimeException {
  constructor(metatypeOrToken: Type<any> | Abstract<any> | string | symbol) {
    let name = isFunction(metatypeOrToken)
      ? (metatypeOrToken as Function).name
      : metatypeOrToken;
    name = name && name.toString();

    super(INVALID_CLASS_SCOPE_MESSAGE`${name}`);
  }
}
