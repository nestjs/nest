import { RuntimeException } from '@nestjs/core/errors/exceptions/runtime.exception.js';

export class InvalidSocketPortException extends RuntimeException {
  constructor(port: number | string, type: any) {
    super(`Invalid port (${port}) in gateway ${type}`);
  }
}
