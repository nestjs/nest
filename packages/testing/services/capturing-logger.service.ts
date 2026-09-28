import {
  ConsoleLogger,
  type ConsoleLoggerOptions,
  LOG_LEVELS,
  type LogLevel,
} from '@nestjs/common';
import { inspect, isDeepStrictEqual } from 'util';

/**
 * A log call recorded by `CapturingLogger`.
 *
 * @publicApi
 */
export interface CapturedLog {
  level: LogLevel;
  /**
   * The message. A lazy message (a function) is evaluated, and when an
   * `Error` is logged as the message, this is the error's message.
   */
  message: unknown;
  /**
   * The context, e.g. the one passed to `new Logger('Context')`.
   */
  context?: string;
  /**
   * The plain objects passed after the message, merged.
   */
  params?: Record<string, any>;
  /**
   * The first `Error` passed to the call, as the message or after it.
   */
  error?: Error;
  /**
   * The stack trace passed as a string, as in `logger.error(message, stack)`.
   */
  stack?: string;
  /**
   * The arguments, as passed to the logger (including the context).
   */
  args: unknown[];
}

/**
 * Criteria for `CapturingLogger` queries. Every criterion that is set must
 * match.
 *
 * @publicApi
 */
export interface CapturedLogFilter {
  level?: LogLevel;
  /**
   * A string matches the context exactly.
   */
  context?: string | RegExp;
  /**
   * A string matches when the message contains it. Only string messages
   * match (an `Error` logged as the message counts, through its message).
   */
  message?: string | RegExp;
  /**
   * Matches when each of these params is deeply equal to the logged one.
   */
  params?: Record<string, unknown>;
}

/**
 * @publicApi
 */
export type CapturedLogMatcher =
  CapturedLogFilter | ((entry: CapturedLog) => boolean);

/**
 * @publicApi
 */
export interface CapturingLoggerOptions extends ConsoleLoggerOptions {
  /**
   * If enabled, logs are also printed, as a `ConsoleLogger` with the same
   * options would print them.
   * @default false
   */
  print?: boolean;
}

/**
 * A logger for tests that records every log call with its structured data,
 * so that tests can assert on it. Pass it to `setLogger()` of the testing
 * module builder, or to `app.useLogger()`, to capture the framework's logs and
 * the logs of `Logger` instances.
 *
 * Every level is captured unless `logLevels` is set; the `NEST_LOG_LEVEL`
 * environment variable is ignored.
 *
 * @example
 * const logger = new CapturingLogger();
 * const moduleRef = await Test.createTestingModule({ providers: [PaymentsService] })
 *   .setLogger(logger)
 *   .compile();
 *
 * await moduleRef.get(PaymentsService).charge(order);
 *
 * logger.assertLogged({ level: 'warn', context: 'PaymentsService', message: /retrying/ });
 *
 * @publicApi
 */
export class CapturingLogger extends ConsoleLogger {
  private readonly captured: CapturedLog[] = [];
  private readonly shouldPrint: boolean;

  constructor(options: CapturingLoggerOptions = {}) {
    const { print = false, ...consoleLoggerOptions } = options;
    super({
      ...consoleLoggerOptions,
      logLevels: consoleLoggerOptions.logLevels ?? [...LOG_LEVELS],
    });
    this.shouldPrint = print;
  }

  /**
   * The recorded entries, oldest first.
   */
  get entries(): CapturedLog[] {
    return [...this.captured];
  }

  log(message: any, ...optionalParams: any[]) {
    this.capture('log', [message, ...optionalParams]);
  }

  error(message: any, ...optionalParams: any[]) {
    this.capture('error', [message, ...optionalParams]);
  }

  warn(message: any, ...optionalParams: any[]) {
    this.capture('warn', [message, ...optionalParams]);
  }

  debug(message: any, ...optionalParams: any[]) {
    this.capture('debug', [message, ...optionalParams]);
  }

  verbose(message: any, ...optionalParams: any[]) {
    this.capture('verbose', [message, ...optionalParams]);
  }

  fatal(message: any, ...optionalParams: any[]) {
    this.capture('fatal', [message, ...optionalParams]);
  }

  /**
   * Returns the entries that match.
   */
  filter(matcher: CapturedLogMatcher = {}): CapturedLog[] {
    const predicate = toPredicate(matcher);
    return this.captured.filter(entry => predicate(entry));
  }

  /**
   * Returns the first entry that matches.
   */
  find(matcher: CapturedLogMatcher): CapturedLog | undefined {
    return this.captured.find(toPredicate(matcher));
  }

  /**
   * Throws an error listing the captured entries if no entry matches.
   * @returns The first entry that matches.
   */
  assertLogged(matcher: CapturedLogMatcher): CapturedLog {
    const entry = this.find(matcher);
    if (!entry) {
      throw new Error(
        `Expected a log entry matching ${describeMatcher(matcher)}, but none of the ${this.captured.length} captured entries matched.${formatEntries(this.captured)}`,
      );
    }
    return entry;
  }

  /**
   * Throws an error listing the matching entries if any entry matches.
   */
  assertNotLogged(matcher: CapturedLogMatcher): void {
    const entries = this.filter(matcher);
    if (entries.length > 0) {
      throw new Error(
        `Expected no log entry matching ${describeMatcher(matcher)}, but ${entries.length} matched.${formatEntries(entries)}`,
      );
    }
  }

  /**
   * Removes the recorded entries.
   */
  clear(): void {
    this.captured.length = 0;
  }

  private capture(level: LogLevel, args: unknown[]) {
    if (!this.isLevelEnabled(level)) {
      return;
    }
    const parsed =
      level === 'error' || level === 'fatal'
        ? this.getContextAndStackAndMessagesToPrint(args)
        : this.getContextAndMessagesToPrint(args);
    // Evaluated once, for the entry and for printing.
    const resolvedMessages = parsed.messages.map(message =>
      this.resolveMessage(message),
    );
    const { messages, error } = this.extractJsonError(resolvedMessages);
    const params = 'params' in parsed ? parsed.params : undefined;
    const stack =
      'stack' in parsed && typeof parsed.stack === 'string'
        ? parsed.stack
        : undefined;

    const entry: CapturedLog = { level, message: messages[0], args };
    if (parsed.context) {
      entry.context = parsed.context;
    }
    if (params) {
      entry.params = params;
    }
    if (error) {
      entry.error = error;
    }
    if (stack) {
      entry.stack = stack;
    }
    this.captured.push(entry);

    if (this.shouldPrint) {
      // What the ConsoleLogger method for this level does once the arguments
      // are parsed.
      const isError = level === 'error' || level === 'fatal';
      this.printMessages(
        resolvedMessages,
        parsed.context,
        level,
        isError ? 'stderr' : 'stdout',
        stack,
        params,
      );
      if (isError) {
        this.printStackTrace(stack!);
      }
    }
  }
}

function toPredicate(
  matcher: CapturedLogMatcher,
): (entry: CapturedLog) => boolean {
  if (typeof matcher === 'function') {
    return matcher;
  }
  const { level, context, message, params } = matcher;
  return entry =>
    (level === undefined || entry.level === level) &&
    (context === undefined ||
      (typeof context === 'string'
        ? entry.context === context
        : entry.context !== undefined &&
          entry.context.search(context) !== -1)) &&
    (message === undefined ||
      (typeof entry.message === 'string' &&
        (typeof message === 'string'
          ? entry.message.includes(message)
          : entry.message.search(message) !== -1))) &&
    (params === undefined ||
      Object.entries(params).every(([key, value]) =>
        isDeepStrictEqual(entry.params?.[key], value),
      ));
}

function describeMatcher(matcher: CapturedLogMatcher): string {
  return typeof matcher === 'function'
    ? 'the predicate'
    : inspect(matcher, { breakLength: Infinity });
}

const MAX_LISTED_ENTRIES = 50;

function formatEntries(entries: CapturedLog[]): string {
  if (entries.length === 0) {
    return '';
  }
  const lines = entries.slice(-MAX_LISTED_ENTRIES).map(entry => {
    const context = entry.context ? ` [${entry.context}]` : '';
    const message =
      typeof entry.message === 'string'
        ? entry.message
        : inspect(entry.message, { breakLength: Infinity, depth: 2 });
    const params = entry.params
      ? ` ${inspect(entry.params, { breakLength: Infinity, depth: 2 })}`
      : '';
    return `  ${entry.level.toUpperCase()}${context} ${message}${params}`;
  });
  const omitted = entries.length - lines.length;
  const header = omitted > 0 ? `\n  (${omitted} earlier entries omitted)` : '';
  return `\nCaptured entries:${header}\n${lines.join('\n')}`;
}
