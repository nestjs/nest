import { RuntimeException } from './runtime.exception';
import { InvalidMiddlewareMessage } from '../messages';

export class InvalidMiddlewareException extends RuntimeException {
  constructor(name: string) {
    super(InvalidMiddlewareMessage(name));
  }
}
