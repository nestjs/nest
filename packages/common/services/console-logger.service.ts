import { inspect, InspectOptions } from 'util';
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

const DEFAULT_DEPTH = 5;

export interface ConsoleLoggerOptions {
  /**
   * Enabled log levels.
   */
  logLevels?: LogLevel[];
  /**
   * If enabled, will print timestamp (time difference) between current and previous log message.
   * Note: This option is not used when `json` is enabled.
   */
  timestamp?: boolean;
  /**
   * A prefix to be used for each log message.
   * Note: This option is not used when `json` is enabled.
   */
  prefix?: string;
  /**
   * If enabled, will print the log message in JSON format.
   */
  json?: boolean;
  /**
   * If enabled, will print the log message in color.
   * Default true if json is disabled, false otherwise
   */
  colors?: boolean;
  /**
   * The context of the logger.
   */
  context?: string;
  /**
   * If enabled, will print the log message in a single line, even if it is an object with multiple properties.
   * If set to a number, the most n inner elements are united on a single line as long as all properties fit into breakLength. Short array elements are also grouped together.
   * Default true when `json` is enabled, false otherwise.
   */
  compact?: boolean | number;
  /**
   * Specifies the maximum number of Array, TypedArray, Map, Set, WeakMap, and WeakSet elements to include when formatting.
   * Set to null or Infinity to show all elements. Set to 0 or negative to show no elements.
   * Ignored when `json` is enabled, colors are disabled, and `compact` is set to true as it produces a parseable JSON output.
   * @default 100
   */
  maxArrayLength?: number;
  /**
   * Specifies the maximum number of characters to include when formatting.
   * Set to null or Infinity to show all elements. Set to 0 or negative to show no characters.
   * Ignored when `json` is enabled, colors are disabled, and `compact` is set to true as it produces a parseable JSON output.
   * @default 10000.
   */
  maxStringLength?: number;
  /**
   * If enabled, will sort keys while formatting objects.
   * Can also be a custom sorting function.
   * Ignored when `json` is enabled, colors are disabled, and `compact` is set to true as it produces a parseable JSON output.
   * @default false
   */
  sorted?: boolean | ((a: string, b: string) => number);
  /**
   * Specifies the number of times to recurse while formatting object. T
   * This is useful for inspecting large objects. To recurse up to the maximum call stack size pass Infinity or null.
   * Ignored when `json` is enabled, colors are disabled, and `compact` is set to true as it produces a parseable JSON output.
   * @default 5
   */
  depth?: number;
  /**
   * If true, object's non-enumerable symbols and properties are included in the formatted result.
   * WeakMap and WeakSet entries are also included as well as user defined prototype properties
   * @default false
   */
  showHidden?: boolean;
  /**
   * The length at which input values are split across multiple lines. Set to Infinity to format the input as a single line (in combination with "compact" set to true).
   * Default Infinity when "compact" is true, 80 otherwise.
   * Ignored when `json` is enabled, colors are disabled, and `compact` is set to true as it produces a parseable JSON output.
   */
  breakLength?: number;
}

const DEFAULT_LOG_LEVELS: LogLevel[] = [
  'log',
  'error',
  'warn',
  'debug',
  'verbose',
  'fatal',
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
  /**
   * The options of the logger.
   */
  protected options: ConsoleLoggerOptions;
  /**
   * The context of the logger (can be set manually or automatically inferred).
   */
  protected context?: string;
  /**
   * The original context of the logger (set in the constructor).
   */
  protected originalContext?: string;
  /**
   * The options used for the "inspect" method.
   */
  protected inspectOptions: InspectOptions;
  /**
   * The last timestamp at which the log message was printed.
   */
  protected static lastTimestampAt?: number;

  constructor();
  constructor(context: string);
  constructor(options: ConsoleLoggerOptions);
  constructor(context: string, options: ConsoleLoggerOptions);
  constructor(
    @Optional()
    contextOrOptions?: string | ConsoleLoggerOptions,
    @Optional()
    options?: ConsoleLoggerOptions,
  ) {
    // eslint-disable-next-line prefer-const
    let [context, opts] = isString(contextOrOptions)
      ? [contextOrOptions, options]
      : options
        ? [undefined, options]
        : [contextOrOptions?.context, contextOrOptions];

    opts = opts ?? {};
    opts.logLevels ??= DEFAULT_LOG_LEVELS;
    opts.colors ??= opts.colors ?? (opts.json ? false : true);
    opts.prefix ??= 'Nest';

    this.options = opts;
    this.inspectOptions = this.getInspectOptions();

    if (context) {
      this.context = context;
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

    this.printMessages(messages, context, 'error', 'stderr', stack);
    this.printStackTrace(stack!);
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
   * Write a 'fatal' level log, if the configured level allows for it.
   * Prints to `stdout` with newline.
   */
  fatal(message: any, context?: string): void;
  fatal(message: any, ...optionalParams: [...any, string?]): void;
  fatal(message: any, ...optionalParams: any[]) {
    if (!this.isLevelEnabled('fatal')) {
      return;
    }
    const { messages, context } = this.getContextAndMessagesToPrint([
      message,
      ...optionalParams,
    ]);
    this.printMessages(messages, context, 'fatal');
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
    errorStack?: unknown,
  ) {
    messages.forEach(message => {
      if (this.options.json) {
        this.printAsJson(message, {
          context,
          logLevel,
          writeStreamType,
          errorStack,
        });
        return;
      }
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

  protected printAsJson(
    message: unknown,
    options: {
      context: string;
      logLevel: LogLevel;
      writeStreamType?: 'stdout' | 'stderr';
      errorStack?: unknown;
    },
  ) {
    type JsonLogObject = {
      level: LogLevel;
      pid: number;
      timestamp: number;
      message: unknown;
      context?: string;
      stack?: unknown;
    };

    const logObject: JsonLogObject = {
      level: options.logLevel,
      pid: process.pid,
      timestamp: Date.now(),
      message,
    };

    if (options.context) {
      logObject.context = options.context;
    }

    if (options.errorStack) {
      logObject.stack = options.errorStack;
    }

    const formattedMessage =
      !this.options.colors && this.inspectOptions.compact === true
        ? JSON.stringify(logObject, this.stringifyReplacer)
        : inspect(logObject, this.inspectOptions);
    process[options.writeStreamType ?? 'stdout'].write(`${formattedMessage}\n`);
  }

  protected formatPid(pid: number) {
    return `[${this.options.prefix}] ${pid}  - `;
  }

  protected formatContext(context: string): string {
    if (!context) {
      return '';
    }

    context = `[${context}] `;
    return this.options.colors ? yellow(context) : context;
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
    if (isFunction(message)) {
      const messageAsStr = Function.prototype.toString.call(message);
      const isClass = messageAsStr.startsWith('class ');
      if (isClass) {
        // If the message is a class, we will display the class name.
        return this.stringifyMessage(message.name, logLevel);
      }
      // If the message is a non-class function, call it and re-resolve its value.
      return this.stringifyMessage(message(), logLevel);
    }

    if (typeof message === 'string') {
      return this.colorize(message, logLevel);
    }

    const outputText = inspect(message, this.inspectOptions);
    if (isPlainObject(message)) {
      return `Object(${Object.keys(message).length}) ${outputText}`;
    }
    if (Array.isArray(message)) {
      return `Array(${message.length}) ${outputText}`;
    }
    return outputText;
  }

  protected colorize(message: string, logLevel: LogLevel) {
    if (!this.options.colors || this.options.json) {
      return message;
    }
    const color = this.getColorByLogLevel(logLevel);
    return color(message);
  }

  protected printStackTrace(stack: string) {
    if (!stack || this.options.json) {
      return;
    }
    process.stderr.write(`${stack}\n`);
  }

  protected updateAndGetTimestampDiff(): string {
    const includeTimestamp =
      ConsoleLogger.lastTimestampAt && this.options?.timestamp;
    const result = includeTimestamp
      ? this.formatTimestampDiff(Date.now() - ConsoleLogger.lastTimestampAt!)
      : '';
    ConsoleLogger.lastTimestampAt = Date.now();
    return result;
  }

  protected formatTimestampDiff(timestampDiff: number) {
    const formattedDiff = ` +${timestampDiff}ms`;
    return this.options.colors ? yellow(formattedDiff) : formattedDiff;
  }

  protected getInspectOptions() {
    let breakLength = this.options.breakLength;
    if (typeof breakLength === 'undefined') {
      breakLength = this.options.colors
        ? this.options.compact
          ? Infinity
          : undefined
        : this.options.compact === false
          ? undefined
          : Infinity; // default breakLength to Infinity if inline is not set and colors is false
    }

    const inspectOptions: InspectOptions = {
      depth: this.options.depth ?? DEFAULT_DEPTH,
      sorted: this.options.sorted,
      showHidden: this.options.showHidden,
      compact: this.options.compact ?? (this.options.json ? true : false),
      colors: this.options.colors,
      breakLength,
    };

    if (this.options.maxArrayLength) {
      inspectOptions.maxArrayLength = this.options.maxArrayLength;
    }
    if (this.options.maxStringLength) {
      inspectOptions.maxStringLength = this.options.maxStringLength;
    }

    return inspectOptions;
  }

  protected stringifyReplacer(key: string, value: unknown) {
    // Mimic util.inspect behavior for JSON logger with compact on and colors off
    if (typeof value === 'bigint') {
      return value.toString();
    }
    if (typeof value === 'symbol') {
      return value.toString();
    }

    if (
      value instanceof Map ||
      value instanceof Set ||
      value instanceof Error
    ) {
      return `${inspect(value, this.inspectOptions)}`;
    }
    return value;
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
      context: lastElement,
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
      stack: lastElement,
      messages: messages.slice(0, messages.length - 1),
      context,
    };
  }

  private isStackFormat(stack: unknown) {
    if (!isString(stack) && !isUndefined(stack)) {
      return false;
    }

    return /^(.)+\n\s+at .+:\d+:\d+/.test(stack!);
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
      case 'fatal':
        return clc.bold;
      default:
        return clc.green;
    }
  }
}
