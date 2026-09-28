import { LOG_LEVELS, LogLevel } from '../log-levels.constant.js';

/**
 * @publicApi
 */
export function isLogLevel(maybeLogLevel: any): maybeLogLevel is LogLevel {
  return LOG_LEVELS.includes(maybeLogLevel);
}
