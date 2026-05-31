import { USING_INVALID_CLASS_AS_A_MODULE_MESSAGE } from '../messages';
import { RuntimeException } from './runtime.exception';

export class InvalidClassModuleException extends RuntimeException {
  constructor(
    metatypeUsedAsAModule: any,
    scope: any[],
    classKind: 'provider' | 'controller' | 'filter',
  ) {
    super(
      USING_INVALID_CLASS_AS_A_MODULE_MESSAGE(
        metatypeUsedAsAModule,
        scope,
        classKind,
      ),
    );
  }
}
