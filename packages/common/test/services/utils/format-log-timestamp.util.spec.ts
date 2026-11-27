import { formatLogTimestamp } from '../../../services/utils/format-log-timestamp.util.js';

describe('formatLogTimestamp', () => {
  const formatter = new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    day: '2-digit',
    month: '2-digit',
  });

  beforeEach(() => {
    // Only Date: faking Intl as well would hide the formatter the util uses
    vi.useFakeTimers({ toFake: ['Date'] });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('should format the current time', () => {
    const now = new Date(2026, 10, 24, 10, 15, 30, 250);
    vi.setSystemTime(now);

    expect(formatLogTimestamp()).toBe(formatter.format(now));
  });

  it('should format the time once for all the lines of the same second', () => {
    const format = vi.spyOn(Intl.DateTimeFormat.prototype, 'format', 'get');

    vi.setSystemTime(new Date(2026, 10, 24, 10, 15, 31, 100));
    const first = formatLogTimestamp();
    vi.setSystemTime(new Date(2026, 10, 24, 10, 15, 31, 900));
    const second = formatLogTimestamp();

    expect(second).toBe(first);
    expect(format).toHaveBeenCalledTimes(1);
  });

  it('should format the time again once the second changes', () => {
    vi.setSystemTime(new Date(2026, 10, 24, 10, 15, 32, 999));
    formatLogTimestamp();
    const next = new Date(2026, 10, 24, 10, 15, 33, 0);
    vi.setSystemTime(next);

    expect(formatLogTimestamp()).toBe(formatter.format(next));
  });
});
