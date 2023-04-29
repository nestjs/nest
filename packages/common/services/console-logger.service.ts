import { Injectable, Optional } from '../decorators/core';
import { clc, yellow } from '../utils/cli-colors.util';
import {
  isFunction,
  isPlainObject,
  isString,
  isUndefined,
} from '../utils/shared.utils';
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

const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  second: 'numeric',
  day: '2-digit',
  month: '2-digit',
});

@Injectable()
export class ConsoleLogger implements LoggerService {
  private static lastTimestampAt?: number;
  private originalContext?: string;

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
    if (context) {
      this.originalContext = context;
    }
  }

  /**
   * Write a 'log' level log, if the configured level allows for it.
   * Prints to `stdout` with newline.
   */
  log(message: any, context?: string): void;
  log(message: any, ...optionalParams: [...any, string?]): void;
  log(message: any, ...optionalParams: any[]) {
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
  error(message: any, stackOrContext?: string): void;
  error(message: any, stack?: string, context?: string): void;
  error(message: any, ...optionalParams: [...any, string?, string?]): void;
  error(message: any, ...optionalParams: any[]) {
    if (!this.isLevelEnabled('error')) {
      return;
    }
    const { messages, context, stack } =
      this.getContextAndStackAndMessagesToPrint([message, ...optionalParams]);

    this.printMessages(messages, context, 'error', 'stderr');
    this.printStackTrace(stack);
  }

  /**
   * Write a 'warn' level log, if the configured level allows for it.
   * Prints to `stdout` with newline.
   */
  warn(message: any, context?: string): void;
  warn(message: any, ...optionalParams: [...any, string?]): void;
  warn(message: any, ...optionalParams: any[]) {
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
  debug(message: any, ...optionalParams: [...any, string?]): void;
  debug(message: any, ...optionalParams: any[]) {
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
  verbose(message: any, ...optionalParams: [...any, string?]): void;
  verbose(message: any, ...optionalParams: any[]) {
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

  /**
   * Resets the logger context to the value that was passed in the constructor.
   */
  resetContext() {
    this.context = this.originalContext;
  }

  isLevelEnabled(level: LogLevel): boolean {
    const logLevels = this.options?.logLevels;
    return isLogLevelEnabled(level, logLevels);
  }

  protected getTimestamp(): string {
    return dateTimeFormatter.format(Date.now());
  }

  protected printMessages(
    messages: unknown[],
    context = '',
    logLevel: LogLevel = 'log',
    writeStreamType?: 'stdout' | 'stderr',
  ) {
    messages.forEach(message => {
      const pidMessage = this.formatPid(process.pid);
      const contextMessage = this.formatContext(context);
      const timestampDiff = this.updateAndGetTimestampDiff();
      const formattedLogLevel = logLevel.toUpperCase().padStart(7, ' ');
      const formattedMessage = this.formatMessage(
        logLevel,
        message,
        pidMessage,
        formattedLogLevel,
        contextMessage,
        timestampDiff,
      );

      process[writeStreamType ?? 'stdout'].write(formattedMessage);
    });
  }

  protected formatPid(pid: number) {
    return `[Nest] ${pid}  - `;
  }

  protected formatContext(context: string): string {
    return context ? yellow(`[${context}] `) : '';
  }

  protected formatMessage(
    logLevel: LogLevel,
    message: unknown,
    pidMessage: string,
    formattedLogLevel: string,
    contextMessage: string,
    timestampDiff: string,
  ) {
    const output = this.stringifyMessage(message, logLevel);
    pidMessage = this.colorize(pidMessage, logLevel);
    formattedLogLevel = this.colorize(formattedLogLevel, logLevel);
    return `${pidMessage}${this.getTimestamp()} ${formattedLogLevel} ${contextMessage}${output}${timestampDiff}\n`;
  }

  protected stringifyMessage(message: unknown, logLevel: LogLevel) {
    // If the message is a function, call it and re-resolve its value.
    return isFunction(message)
      ? this.stringifyMessage(message(), logLevel)
      : isPlainObject(message) || Array.isArray(message)
      ? `${this.colorize('Object:', logLevel)}\n${JSON.stringify(
          message,
          (key, value) =>
            typeof value === 'bigint' ? value.toString() : value,
          2,
        )}\n`
      : this.colorize(message as string, logLevel);
  }

  protected colorize(message: string, logLevel: LogLevel) {
    const color = this.getColorByLogLevel(logLevel);
    return color(message);
  }

  protected printStackTrace(stack: string) {
    if (!stack) {
      return;
    }
    process.stderr.write(`${stack}\n`);
  }

  protected updateAndGetTimestampDiff(): string {
    const includeTimestamp =
      ConsoleLogger.lastTimestampAt && this.options?.timestamp;
    const result = includeTimestamp
      ? this.formatTimestampDiff(Date.now() - ConsoleLogger.lastTimestampAt)
      : '';
    ConsoleLogger.lastTimestampAt = Date.now();
    return result;
  }

  protected formatTimestampDiff(timestampDiff: number) {
    return yellow(` +${timestampDiff}ms`);
  }

  private getContextAndMessagesToPrint(args: unknown[]) {
    if (args?.length <= 1) {
      return { messages: args, context: this.context };
    }
    const lastElement = args[args.length - 1];
    const isContext = isString(lastElement);
    if (!isContext) {
      return { messages: args, context: this.context };
    }
    return {
      context: lastElement as string,
      messages: args.slice(0, args.length - 1),
    };
  }

  private getContextAndStackAndMessagesToPrint(args: unknown[]) {
    if (args.length === 2) {
      return this.isStackFormat(args[1])
        ? {
            messages: [args[0]],
            stack: args[1] as string,
            context: this.context,
          }
        : {
            messages: [args[0]],
            context: args[1] as string,
          };
    }

    const { messages, context } = this.getContextAndMessagesToPrint(args);
    if (messages?.length <= 1) {
      return { messages, context };
    }
    const lastElement = messages[messages.length - 1];
    const isStack = isString(lastElement);
    // https://github.com/nestjs/nest/issues/11074#issuecomment-1421680060
    if (!isStack && !isUndefined(lastElement)) {
      return { messages, context };
    }
    return {
      stack: lastElement as string,
      messages: messages.slice(0, messages.length - 1),
      context,
    };
  }

  private isStackFormat(stack: unknown) {
    if (!isString(stack) && !isUndefined(stack)) {
      return false;
    }

    return /^(.)+\n\s+at .+:\d+:\d+$/.test(stack);
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
