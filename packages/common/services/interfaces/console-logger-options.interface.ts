import { LogLevel } from '../logger.service';

export interface ConsoleLoggerOptions {
  /**
   * Enabled log levels.
   */
  logLevels?: LogLevel[];
  /**
   * If enabled, will print timestamp (time difference) between current and previous log message.
   */
  timestamp?: boolean;
}
