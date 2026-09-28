import { LogLevel } from '../log-levels.constant.js';
import { filterLogLevels } from './filter-log-levels.util.js';
import { isLogLevel } from './is-log-level.util.js';

/**
 * The environment variable that sets the default log levels of `ConsoleLogger`.
 */
export const LOG_LEVEL_ENV_VAR = 'NEST_LOG_LEVEL';

/**
 * Reads the log levels from the `NEST_LOG_LEVEL` environment variable.
 * Accepts the formats of `filterLogLevels`: a level (`warn`, that level and
 * above), a list (`warn,error`) or a threshold (`>=warn`, `>debug`).
 *
 * @returns `undefined` when the variable is unset or empty, `false` when its
 * value can't be parsed, the log levels otherwise.
 */
export function getEnvLogLevels(): LogLevel[] | false | undefined {
  const value = process.env[LOG_LEVEL_ENV_VAR]?.replaceAll(' ', '');
  if (!value) {
    return undefined;
  }
  const threshold = /^>=?(.*)$/.exec(value.toLowerCase());
  const isValid = threshold
    ? isLogLevel(threshold[1])
    : value.toLowerCase().split(',').every(isLogLevel);
  return isValid ? filterLogLevels(value) : false;
}
