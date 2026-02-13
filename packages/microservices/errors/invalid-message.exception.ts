import { RuntimeException } from '@nestjs/core/internal';

/**
 * @publicApi
 */
export class InvalidMessageException extends RuntimeException {
  constructor() {
    super(`The invalid data or message pattern (undefined/null)`);
  }
}
