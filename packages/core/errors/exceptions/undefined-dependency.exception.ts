import { RuntimeException } from './runtime.exception';
import { UnknownDependenciesMessage } from '../messages';
import { InjectorDependencyContext } from '../../injector/injector';

export class UndefinedDependencyException extends RuntimeException {
  constructor(type: string, undefinedDependencyContext: InjectorDependencyContext) {
    super(UnknownDependenciesMessage(type, undefinedDependencyContext));
  }
}
