import { LoggerService, LogLevel } from '../services/logger.service';

/**
 * @publicApi
 */
export class NestApplicationContextOptions {
  /**
   * Specifies the logger to use.  Pass `false` to turn off logging.
   */
  logger?: LoggerService | LogLevel[] | boolean;

  /**
   * Whether to abort the process on Error. By default the process is exited.
   * Pass `false` to override default behaviour. If `false` is passed nest will not exit
   * the application on an exception and instead, will throw the exception.
   */
  abortOnError?: boolean | null;
}
