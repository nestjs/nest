import { LoggerService, LogLevel } from '../services/logger.service';

export class NestApplicationContextOptions {
  logger?: LoggerService | LogLevel[] | boolean;
}
