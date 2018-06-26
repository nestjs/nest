import { RuntimeException } from './runtime.exception';
import { UnknownDependenciesMessage } from '../messages';

export class UndefinedDependencyException extends RuntimeException {
  constructor(type: string, index: number, args: any[]) {
    super(UnknownDependenciesMessage(type, index, args));
  }
}
