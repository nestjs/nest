import { RuntimeException } from './exceptions';

export class ExceptionsHandler {
  public handle(exception: RuntimeException | Error) {
    // console.error(exception.message, exception.stack);
    console.error(exception.stack);
  }

  /*private static readonly logger = new Logger(ExceptionsHandler.name);



  public handle(exception: RuntimeException | Error) {
    if (!(exception instanceof RuntimeException)) {
      return ExceptionsHandler.logger.error(exception.message, exception.stack);
    }
    ExceptionsHandler.logger.error(exception.what(), exception.stack);
  }*/
}
