import { RuntimeException } from './runtime.exception';

export class UnknownElementException extends RuntimeException {
  constructor() {
    super(
      'Nest could not find the given element (this class does not exist in the current context)',
    );
  }
}
