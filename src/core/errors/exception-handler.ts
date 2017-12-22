import { RuntimeException } from './exceptions/runtime.exception';
import { Logger } from '@nestjs/common/services/logger.service';

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
