export const LOG_LEVELS = [
  'verbose',
  'debug',
  'log',
  'warn',
  'error',
  'fatal',
] as const satisfies string[];

/**
 * @publicApi
 */
export type LogLevel = (typeof LOG_LEVELS)[number];
