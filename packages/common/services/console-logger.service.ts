import { Injectable } from '../decorators/core/injectable.decorator';
import { Optional } from '../decorators/core/optional.decorator';
import { clc, yellow } from '../utils/cli-colors.util';
import { isPlainObject } from '../utils/shared.utils';
import { LoggerService, LogLevel } from './logger.service';
import { isLogLevelEnabled } from './utils';

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

const DEFAULT_LOG_LEVELS: LogLevel[] = [
  'log',
  'error',
  'warn',
  'debug',
  'verbose',
];

@Injectable()
export class ConsoleLogger implements LoggerService {
  private static lastTimestampAt?: number;

  constructor();
  constructor(context: string);
  constructor(context: string, options: ConsoleLoggerOptions);
  constructor(
    @Optional()
    protected context?: string,
    @Optional()
    protected options: ConsoleLoggerOptions = {},
  ) {
    if (!options.logLevels) {
      options.logLevels = DEFAULT_LOG_LEVELS;
    }
  }

  /**
   * Write a 'log' level log, if the configured level allows for it.
   * Prints to `stdout` with newline.
   */
  log(message: any, context?: string): void;
  log(message: any, ...optionalParams: [...any, string]): void;
  log(message: any, ...optionalParams: [...any, string]) {
    if (!this.isLevelEnabled('log')) {
      return;
    }
    const { messages, context } = this.getContextAndMessagesToPrint([
      message,
      ...optionalParams,
    ]);
    this.printMessages(messages, context, 'log');
  }

  /**
   * Write an 'error' level log, if the configured level allows for it.
   * Prints to `stderr` with newline.
   */
  error(message: any, stack?: string, context?: string): void;
  error(message: any, ...optionalParams: [...any, string, string]): void;
  error(message: any, ...optionalParams: [...any, string, string]) {
    if (!this.isLevelEnabled('error')) {
      return;
    }
    const {
      messages,
      context,
      stack,
    } = this.getContextAndStackAndMessagesToPrint([message, ...optionalParams]);

    this.printMessages(messages, context, 'error', 'stderr');
    this.printStackTrace(stack);
  }

  /**
   * Write a 'warn' level log, if the configured level allows for it.
   * Prints to `stdout` with newline.
   */
  warn(message: any, context?: string): void;
  warn(message: any, ...optionalParams: [...any, string]): void;
  warn(message: any, ...optionalParams: [...any, string]) {
    if (!this.isLevelEnabled('warn')) {
      return;
    }
    const { messages, context } = this.getContextAndMessagesToPrint([
      message,
      ...optionalParams,
    ]);
    this.printMessages(messages, context, 'warn');
  }

  /**
   * Write a 'debug' level log, if the configured level allows for it.
   * Prints to `stdout` with newline.
   */
  debug(message: any, context?: string): void;
  debug(message: any, ...optionalParams: [...any, string]): void;
  debug(message: any, ...optionalParams: [...any, string]) {
    if (!this.isLevelEnabled('debug')) {
      return;
    }
    const { messages, context } = this.getContextAndMessagesToPrint([
      message,
      ...optionalParams,
    ]);
    this.printMessages(messages, context, 'debug');
  }

  /**
   * Write a 'verbose' level log, if the configured level allows for it.
   * Prints to `stdout` with newline.
   */
  verbose(message: any, context?: string): void;
  verbose(message: any, ...optionalParams: [...any, string]): void;
  verbose(message: any, ...optionalParams: [...any, string]) {
    if (!this.isLevelEnabled('verbose')) {
      return;
    }
    const { messages, context } = this.getContextAndMessagesToPrint([
      message,
      ...optionalParams,
    ]);
    this.printMessages(messages, context, 'verbose');
  }

  /**
   * Set log levels
   * @param levels log levels
   */
  setLogLevels(levels: LogLevel[]) {
    if (!this.options) {
      this.options = {};
    }
    this.options.logLevels = levels;
  }

  /**
   * Set logger context
   * @param context context
   */
  setContext(context: string) {
    this.context = context;
  }

  isLevelEnabled(level: LogLevel): boolean {
    const logLevels = this.options?.logLevels;
    return isLogLevelEnabled(level, logLevels);
  }

  protected getTimestamp(): string {
    const localeStringOptions = {
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      day: '2-digit',
      month: '2-digit',
    };
    return new Date(Date.now()).toLocaleString(undefined, localeStringOptions);
  }

  protected printMessages(
    messages: unknown[],
    context = '',
    logLevel: LogLevel = 'log',
    writeStreamType?: 'stdout' | 'stderr',
  ) {
    const color = this.getColorByLogLevel(logLevel);
    messages.forEach(message => {
      const output = isPlainObject(message)
        ? `${color('Object:')}\n${JSON.stringify(message, null, 2)}\n`
        : color(message as string);

      const pidMessage = color(`[Nest] ${process.pid}  - `);
      const contextMessage = context ? yellow(`[${context}] `) : '';
      const timestampDiff = this.updateAndGetTimestampDiff();
      const formattedLogLevel = color(logLevel.toUpperCase().padStart(7, ' '));
      const computedMessage = `${pidMessage}${this.getTimestamp()} ${formattedLogLevel} ${contextMessage}${output}${timestampDiff}\n`;

      process[writeStreamType ?? 'stdout'].write(computedMessage);
    });
  }

  protected printStackTrace(stack: string) {
    if (!stack) {
      return;
    }
    process.stderr.write(`${stack}\n`);
  }

  private updateAndGetTimestampDiff(): string {
    const includeTimestamp =
      ConsoleLogger.lastTimestampAt && this.options?.timestamp;
    const result = includeTimestamp
      ? yellow(` +${Date.now() - ConsoleLogger.lastTimestampAt}ms`)
      : '';
    ConsoleLogger.lastTimestampAt = Date.now();
    return result;
  }

  private getContextAndMessagesToPrint(args: unknown[]) {
    if (args?.length <= 1) {
      return { messages: args, context: this.context };
    }
    const lastElement = args[args.length - 1];
    const isContext = typeof lastElement === 'string';
    if (!isContext) {
      return { messages: args, context: this.context };
    }
    return {
      context: lastElement as string,
      messages: args.slice(0, args.length - 1),
    };
  }

  private getContextAndStackAndMessagesToPrint(args: unknown[]) {
    const { messages, context } = this.getContextAndMessagesToPrint(args);
    if (messages?.length <= 1) {
      return { messages, context };
    }
    const lastElement = messages[messages.length - 1];
    const isStack = typeof lastElement === 'string';
    if (!isStack) {
      return { messages, context };
    }
    return {
      stack: lastElement as string,
      messages: messages.slice(0, messages.length - 1),
      context,
    };
  }

  private getColorByLogLevel(level: LogLevel) {
    switch (level) {
      case 'debug':
        return clc.magentaBright;
      case 'warn':
        return clc.yellow;
      case 'error':
        return clc.red;
      case 'verbose':
        return clc.cyanBright;
      default:
        return clc.green;
    }
  }
}
