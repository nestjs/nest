import { RuntimeException } from './runtime.exception';
import { MissingRequiredDependency } from '../messages';

export class MissingRequiredDependencyException extends RuntimeException {
  constructor(name: string, context: string) {
    super(MissingRequiredDependency(name, context));
  }
}
