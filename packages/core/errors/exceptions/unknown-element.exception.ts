import { RuntimeException } from './runtime.exception';

export class UnknownElementException extends RuntimeException {
  constructor(name?: string) {
    super(
      `Nest cannot find ${name || 'given'} element (it does not exist in current context)`,
    );
  }
}
