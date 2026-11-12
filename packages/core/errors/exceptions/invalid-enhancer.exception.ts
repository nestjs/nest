import { INVALID_ENHANCER_MESSAGE } from '../messages.js';
import { RuntimeException } from './runtime.exception.js';

export class InvalidEnhancerException extends RuntimeException {
  constructor(kind: string, method: string, description: string) {
    super(INVALID_ENHANCER_MESSAGE(kind, method, description));
  }
}
