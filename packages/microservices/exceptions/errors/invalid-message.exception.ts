import { RuntimeException } from '@nestjs/core/errors/exceptions/runtime.exception';

export class InvalidMessageException extends RuntimeException {
  constructor() {
    super(`The invalid data or message pattern (undefined/null)`);
  }
}
