import { RuntimeException } from '@nestjs/core/errors/exceptions/runtime.exception';

export class InvalidTcpMessageException extends RuntimeException {
  constructor() {
    super(`The invalid data or message from tcp recv message.`);
  }
}
