import { LOG_LEVELS, LogLevel } from '../logger.service';
import { isLogLevel } from './is-log-level.util';

/**
 * @publicApi
 */
export function filterLogLevels(parseableString = ''): LogLevel[] {
  const sanitizedSring = parseableString.replaceAll(' ', '').toLowerCase();

  if (sanitizedSring[0] === '>') {
    const orEqual = sanitizedSring[1] === '=';

    const logLevelIndex = (LOG_LEVELS as string[]).indexOf(
      sanitizedSring.substring(orEqual ? 2 : 1),
    );

    if (logLevelIndex === -1) {
      throw new Error(`parse error (unknown log level): ${sanitizedSring}`);
    }

    return LOG_LEVELS.slice(orEqual ? logLevelIndex : logLevelIndex + 1);
  } else if (sanitizedSring.includes(',')) {
    return sanitizedSring.split(',').filter(isLogLevel);
  }

  return isLogLevel(sanitizedSring) ? [sanitizedSring] : LOG_LEVELS;
}
