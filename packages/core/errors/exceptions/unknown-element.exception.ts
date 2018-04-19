import { RuntimeException } from './runtime.exception';

export class UnknownElementException extends RuntimeException {
  constructor() {
    super(
      'Nest cannot find given element (it does not exist in current context)',
    );
  }
}
