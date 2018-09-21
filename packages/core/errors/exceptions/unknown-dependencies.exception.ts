import { InjectorDependencyContext } from '../../injector/injector';
import { UNKNOWN_DEPENDENCIES_MESSAGE } from '../messages';
import { RuntimeException } from './runtime.exception';

export class UnknownDependenciesException extends RuntimeException {
  constructor(
    type: string,
    unknownDependencyContext: InjectorDependencyContext,
  ) {
    super(UNKNOWN_DEPENDENCIES_MESSAGE(type, unknownDependencyContext));
  }
}
