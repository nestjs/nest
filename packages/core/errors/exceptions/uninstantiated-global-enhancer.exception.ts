import { UNINSTANTIATED_GLOBAL_ENHANCER_MESSAGE } from '../messages.js';
import { RuntimeException } from './runtime.exception.js';

export class UninstantiatedGlobalEnhancerException extends RuntimeException {
  constructor(enhancerToken: string, provider: string) {
    super(UNINSTANTIATED_GLOBAL_ENHANCER_MESSAGE(enhancerToken, provider));
  }
}
