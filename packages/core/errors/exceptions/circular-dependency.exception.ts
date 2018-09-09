import { RuntimeException } from './runtime.exception';

export class CircularDependencyException extends RuntimeException {
  constructor(context?: string) {
    const ctx = context ? ` inside ${context}` : ``;
    super(
      `A circular dependency has been detected${ctx}. Please, make sure that each side of a bidirectional relationships are decorated with "forwardRef()".`,
    );
  }
}
