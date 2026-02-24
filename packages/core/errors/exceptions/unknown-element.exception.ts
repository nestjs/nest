import { RuntimeException } from './runtime.exception';

export class UnknownElementException extends RuntimeException {
  constructor(name?: string | symbol) {
    const elementName = name?.toString() ?? 'the given';

    super(
      `Nest could not find ${elementName} element (this provider does not exist in the current context)`,
    );
  }
}
