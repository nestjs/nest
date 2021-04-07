import { Logger } from '@nestjs/common/services/logger.service';

import { RuntimeException } from './exceptions/runtime.exception';

export class ExceptionHandler {
  private static readonly logger = new Logger(ExceptionHandler.name);

  public handle(exception: RuntimeException | Error) {
    if (!(exception instanceof RuntimeException)) {
      ExceptionHandler.logger.error(exception.message, exception.stack);
      return;
    }
    ExceptionHandler.logger.error(exception.what(), exception.stack);
  }
}
