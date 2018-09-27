import { MissingRequiredDependencyMessage } from '../messages';
import { RuntimeException } from './runtime.exception';

export class MissingRequiredDependencyException extends RuntimeException {
  constructor(name: string, reason: string) {
    super(MissingRequiredDependencyMessage(name, reason));
  }
}
