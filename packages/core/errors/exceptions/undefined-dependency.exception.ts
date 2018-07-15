import { RuntimeException } from './runtime.exception';
import { UnknownDependenciesMessage } from '../messages';

export class UndefinedDependencyException extends RuntimeException {
  constructor(type: string, index: number, dependencies: any[]) {
    super(UnknownDependenciesMessage(type, index, dependencies));
  }
}
