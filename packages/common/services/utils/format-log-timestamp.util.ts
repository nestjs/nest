const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  second: 'numeric',
  day: '2-digit',
  month: '2-digit',
});

let lastFormattedSecond: number | undefined;
let lastFormattedTimestamp = '';

/**
 * Formats the current time for a log line. The format stops at seconds, so
 * the string is formatted once per second and reused by the lines logged
 * within it.
 */
export function formatLogTimestamp(): string {
  const now = Date.now();
  const second = Math.floor(now / 1000);
  if (second !== lastFormattedSecond) {
    lastFormattedTimestamp = dateTimeFormatter.format(now);
    lastFormattedSecond = second;
  }
  return lastFormattedTimestamp;
}
