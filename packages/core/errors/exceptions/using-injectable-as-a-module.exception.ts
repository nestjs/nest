import { USING_INJECTABLE_AS_A_MODULE_MESSAGE } from '../messages';
import { RuntimeException } from './runtime.exception';

export class UsingInjectableAsAModuleException extends RuntimeException {
  /**
   * @param injectableClassRefOrBadForwardModule The injectable class being used
   * as a module, or a forward module that wrongly imports an injectable.
   */
  constructor(injectableClassRefOrBadForwardModule: any, scope: any[]) {
    super(
      USING_INJECTABLE_AS_A_MODULE_MESSAGE(
        injectableClassRefOrBadForwardModule,
        scope,
      ),
    );
  }
}
