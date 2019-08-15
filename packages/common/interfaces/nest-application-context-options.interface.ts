import { LoggerService } from '../services/logger.service';

/**
 * @publicApi
 */
export class NestApplicationContextOptions {
  /**
   * specify the logger to use
   */
  logger?: LoggerService | boolean;
}
