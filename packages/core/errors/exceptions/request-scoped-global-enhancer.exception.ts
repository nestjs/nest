import { REQUEST_SCOPED_GLOBAL_ENHANCER_MESSAGE } from '../messages.js';
import { RuntimeException } from './runtime.exception.js';

export class RequestScopedGlobalEnhancerException extends RuntimeException {
  constructor(enhancerToken: string, provider: string, isAlias: boolean) {
    super(
      REQUEST_SCOPED_GLOBAL_ENHANCER_MESSAGE(enhancerToken, provider, isAlias),
    );
  }
}
