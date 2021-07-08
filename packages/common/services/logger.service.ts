import { Injectable } from '../decorators/core/injectable.decorator';
import { Optional } from '../decorators/core/optional.decorator';
import { isObject } from '../utils/shared.utils';
import { ConsoleLogger } from './console-logger.service';
import { isLogLevelEnabled } from './utils';

export type LogLevel = 'log' | 'error' | 'warn' | 'debug' | 'verbose';

export interface LoggerService {
  /**
   * Write a 'log' level log.
   */
  log(message: any, ...optionalParams: any[]): any;

  /**
   * Write an 'error' level log.
   */
  error(message: any, ...optionalParams: any[]): any;

  /**
   * Write a 'warn' level log.
   */
  warn(message: any, ...optionalParams: any[]): any;

  /**
   * Write a 'debug' level log.
   */
  debug?(message: any, ...optionalParams: any[]): any;

  /**
   * Write a 'verbose' level log.
   */
  verbose?(message: any, ...optionalParams: any[]): any;

  /**
   * Set log levels.
   * @param levels log levels
   */
  setLogLevels?(levels: LogLevel[]): any;
}

interface LogBufferRecord {
  /**
   * Method to execute.
   */
  methodRef: Function;

  /**
   * Arguments to pass to the method.
   */
  arguments: unknown[];
}

const DEFAULT_LOGGER = new ConsoleLogger();

@Injectable()
export class Logger implements LoggerService {
  protected static logBuffer = new Array<LogBufferRecord>();
  protected static staticInstanceRef?: LoggerService = DEFAULT_LOGGER;
  protected static logLevels?: LogLevel[];
  private static isBufferAttached: boolean;

  protected localInstanceRef?: LoggerService;

  private static WrapBuffer: MethodDecorator = (
    target: object,
    propertyKey: string | symbol,
    descriptor: TypedPropertyDescriptor<any>,
  ) => {
    const originalFn = descriptor.value;
    descriptor.value = function (...args: unknown[]) {
      if (Logger.isBufferAttached) {
        Logger.logBuffer.push({
          methodRef: originalFn.bind(this),
          arguments: args,
        });
        return;
      }
      return originalFn.call(this, ...args);
    };
  };

  constructor();
  constructor(context: string);
  /**
   * @deprecated isTimestampEnabled is deprecated. Use "{ timestamp?: boolean }" object instead.
   */
  constructor(context: string, isTimestampEnabled?: boolean);
  constructor(context: string, options?: { timestamp?: boolean });
  constructor(
    @Optional() protected context?: string,
    @Optional() protected options: { timestamp?: boolean } | boolean = {},
  ) {}

  get localInstance(): LoggerService {
    if (typeof this.options === 'boolean') {
      this.options = { timestamp: this.options };
    }

    if (Logger.staticInstanceRef === DEFAULT_LOGGER) {
      if (this.localInstanceRef) {
        return this.localInstanceRef;
      }
      this.localInstanceRef = new ConsoleLogger(this.context, {
        timestamp: this.options?.timestamp,
        logLevels: Logger.logLevels,
      });
      return this.localInstanceRef;
    }
    return Logger.staticInstanceRef;
  }

  /**
   * Write an 'error' level log.
   */
  error(message: any, stack?: string, context?: string): void;
  error(message: any, ...optionalParams: [...any, string?, string?]): void;
  @Logger.WrapBuffer
  error(message: any, ...optionalParams: any[]) {
    optionalParams = this.context
      ? optionalParams.concat(this.context)
      : optionalParams;

    this.localInstance?.error(message, ...optionalParams);
  }

  /**
   * Write a 'log' level log.
   */
  log(message: any, context?: string): void;
  log(message: any, ...optionalParams: [...any, string?]): void;
  @Logger.WrapBuffer
  log(message: any, ...optionalParams: any[]) {
    optionalParams = this.context
      ? optionalParams.concat(this.context)
      : optionalParams;
    this.localInstance?.log(message, ...optionalParams);
  }

  /**
   * Write a 'warn' level log.
   */
  warn(message: any, context?: string): void;
  warn(message: any, ...optionalParams: [...any, string?]): void;
  @Logger.WrapBuffer
  warn(message: any, ...optionalParams: any[]) {
    optionalParams = this.context
      ? optionalParams.concat(this.context)
      : optionalParams;
    this.localInstance?.warn(message, ...optionalParams);
  }

  /**
   * Write a 'debug' level log.
   */
  debug(message: any, context?: string): void;
  debug(message: any, ...optionalParams: [...any, string?]): void;
  @Logger.WrapBuffer
  debug(message: any, ...optionalParams: any[]) {
    optionalParams = this.context
      ? optionalParams.concat(this.context)
      : optionalParams;
    this.localInstance?.debug(message, ...optionalParams);
  }

  /**
   * Write a 'verbose' level log.
   */
  verbose(message: any, context?: string): void;
  verbose(message: any, ...optionalParams: [...any, string?]): void;
  @Logger.WrapBuffer
  verbose(message: any, ...optionalParams: any[]) {
    optionalParams = this.context
      ? optionalParams.concat(this.context)
      : optionalParams;
    this.localInstance?.verbose(message, ...optionalParams);
  }

  /**
   * Write an 'error' level log.
   */
  static error(message: any, context?: string): void;
  static error(message: any, stack?: string, context?: string): void;
  static error(
    message: any,
    ...optionalParams: [...any, string?, string?]
  ): void;
  @Logger.WrapBuffer
  static error(message: any, ...optionalParams: any[]) {
    this.staticInstanceRef?.error(message, ...optionalParams);
  }

  /**
   * Write a 'log' level log.
   */
  static log(message: any, context?: string): void;
  static log(message: any, ...optionalParams: [...any, string?]): void;
  @Logger.WrapBuffer
  static log(message: any, ...optionalParams: any[]) {
    this.staticInstanceRef?.log(message, ...optionalParams);
  }

  /**
   * Write a 'warn' level log.
   */
  static warn(message: any, context?: string): void;
  static warn(message: any, ...optionalParams: [...any, string?]): void;
  @Logger.WrapBuffer
  static warn(message: any, ...optionalParams: any[]) {
    this.staticInstanceRef?.warn(message, ...optionalParams);
  }

  /**
   * Write a 'debug' level log, if the configured level allows for it.
   * Prints to `stdout` with newline.
   */
  static debug(message: any, context?: string): void;
  static debug(message: any, ...optionalParams: [...any, string?]): void;
  @Logger.WrapBuffer
  static debug(message: any, ...optionalParams: any[]) {
    this.staticInstanceRef?.debug(message, ...optionalParams);
  }

  /**
   * Write a 'verbose' level log.
   */
  static verbose(message: any, context?: string): void;
  static verbose(message: any, ...optionalParams: [...any, string?]): void;
  @Logger.WrapBuffer
  static verbose(message: any, ...optionalParams: any[]) {
    this.staticInstanceRef?.verbose(message, ...optionalParams);
  }

  /**
   * Print buffered logs and detach buffer.
   */
  static flush() {
    this.isBufferAttached = false;
    this.logBuffer.forEach(item =>
      item.methodRef(...(item.arguments as [string])),
    );
    this.logBuffer = [];
  }

  /**
   * Attach buffer.
   * Turns on initialisation logs buffering.
   */
  static attachBuffer() {
    this.isBufferAttached = true;
  }

  /**
   * Detach buffer.
   * Turns off initialisation logs buffering.
   */
  static detachBuffer() {
    this.isBufferAttached = false;
  }

  static getTimestamp() {
    const localeStringOptions = {
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      day: '2-digit',
      month: '2-digit',
    };
    return new Date(Date.now()).toLocaleString(
      undefined,
      localeStringOptions as Intl.DateTimeFormatOptions,
    );
  }

  static overrideLogger(logger: LoggerService | LogLevel[] | boolean) {
    if (Array.isArray(logger)) {
      Logger.logLevels = logger;
      return this.staticInstanceRef?.setLogLevels(logger);
    }
    this.staticInstanceRef = isObject(logger)
      ? (logger as LoggerService)
      : undefined;
  }

  static isLevelEnabled(level: LogLevel): boolean {
    const logLevels = Logger.logLevels;
    return isLogLevelEnabled(level, logLevels);
  }
}
