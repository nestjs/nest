import {InvalidMiddlewareMessage} from '../messages';

import {RuntimeException} from './runtime.exception';

export class InvalidMiddlewareException extends RuntimeException {
  constructor(name: string) { super(InvalidMiddlewareMessage(name)); }
}