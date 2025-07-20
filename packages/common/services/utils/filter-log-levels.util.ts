import { LOG_LEVELS, LogLevel } from '../logger.service';
import { isLogLevel } from './is-log-level.util';

/**
 * @publicApi
 */
export function filterLogLevels(parseableString = ''): LogLevel[] {
  const sanitizedString = parseableString.replaceAll(' ', '').toLowerCase();

  if (sanitizedString[0] === '>') {
    const orEqual = sanitizedString[1] === '=';

    const logLevelIndex = (LOG_LEVELS as string[]).indexOf(
      sanitizedString.substring(orEqual ? 2 : 1),
    );

    if (logLevelIndex === -1) {
      throw new Error(`parse error (unknown log level): ${sanitizedString}`);
    }

    return LOG_LEVELS.slice(orEqual ? logLevelIndex : logLevelIndex + 1);
  } else if (sanitizedString.includes(',')) {
    return sanitizedString.split(',').filter(isLogLevel);
  }

  return isLogLevel(sanitizedString) ? [sanitizedString] : LOG_LEVELS;
}
