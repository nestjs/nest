import { REQUEST_SCOPED_GLOBAL_ENHANCER_MESSAGE } from '../messages';
import { RuntimeException } from './runtime.exception';

export class RequestScopedGlobalEnhancerException extends RuntimeException {
  constructor(
    enhancerToken: string,
    provider: string,
    kind: 'useClass' | 'useExisting' | 'useFactory',
  ) {
    super(
      REQUEST_SCOPED_GLOBAL_ENHANCER_MESSAGE(enhancerToken, provider, kind),
    );
  }
}
