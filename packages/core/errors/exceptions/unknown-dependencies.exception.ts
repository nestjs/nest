import { RuntimeException } from './runtime.exception';
import { UnknownDependenciesMessage } from '../messages';
import { InjectorDependencyContext } from '../../injector/injector';

export class UnknownDependenciesException extends RuntimeException {
  constructor(type: string, unknownDependencyContext: InjectorDependencyContext) {
    super(UnknownDependenciesMessage(type, unknownDependencyContext));
  }
}
