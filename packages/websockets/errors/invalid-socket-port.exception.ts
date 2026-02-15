import { RuntimeException } from '@nestjs/core/internal';

export class InvalidSocketPortException extends RuntimeException {
  constructor(port: number | string, type: any) {
    super(`Invalid port (${port}) in gateway ${type}`);
  }
}
