import { Logger } from '@nestjs/common/services/logger.service';

export class ExceptionHandler {
  private static readonly logger = new Logger(ExceptionHandler.name);

  public handle(exception: Error) {
    ExceptionHandler.logger.error(exception);
  }
}
