import { RuntimeException } from './runtime.exception';

export class CircularDependencyException extends RuntimeException {
  constructor(context?: string) {
    const ctx = context ? ` inside ${context}` : ``;
    super(
      `A circular dependency has been detected${ctx}. Please, make sure that each side of a bidirectional relationships are decorated with "forwardRef()". Note that circular relationships between custom providers (e.g., factories) are not supported since functions cannot be called more than once.`,
    );
  }
}
