import { UNINSTANTIATED_GLOBAL_ENHANCER_MESSAGE } from '../messages';
import { RuntimeException } from './runtime.exception';

export class UninstantiatedGlobalEnhancerException extends RuntimeException {
  constructor(enhancerToken: string, provider: string) {
    super(UNINSTANTIATED_GLOBAL_ENHANCER_MESSAGE(enhancerToken, provider));
  }
}
