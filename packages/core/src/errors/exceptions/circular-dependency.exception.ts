import { RuntimeException } from './runtime.exception';
import { CircularDependencyMessage } from '../messages';

export class CircularDependencyException extends RuntimeException {
  constructor(context: string) {
    super(CircularDependencyMessage(context));
  }
}
