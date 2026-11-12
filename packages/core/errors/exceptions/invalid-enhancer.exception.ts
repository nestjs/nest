import { INVALID_ENHANCER_MESSAGE } from '../messages';
import { RuntimeException } from './runtime.exception';

export class InvalidEnhancerException extends RuntimeException {
  constructor(kind: string, method: string, description: string) {
    super(INVALID_ENHANCER_MESSAGE(kind, method, description));
  }
}
