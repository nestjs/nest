import { RuntimeException } from './runtime.exception';

export class CircularDependencyException extends RuntimeException {
  constructor(context: string) {
    super(
      `A circular dependency has been detected inside ${context}. Please, make sure that each side of a bidirectional relationships are decorated with "forwardRef()".`,
    );
  }
}
