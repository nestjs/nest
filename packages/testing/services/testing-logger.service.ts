/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Logger } from '@nestjs/common';

export class TestingLogger extends Logger {
  constructor() {
    super('Testing');
  }

  log(message: string) {}
  warn(message: string) {}
  error(message: string, trace: string) {
    return Logger.error(message, trace, 'ExceptionHandler');
  }
}
