import * as clc from 'cli-color';
import { Injectable, Optional } from '../decorators';
import { isObject } from '../utils/shared.utils';

declare const process: any;
const yellow = clc.xterm(3);

export interface LoggerService {
  log(message: any, context?: string);
  error(message: any, trace?: string, context?: string);
  warn(message: any, context?: string);
}

@Injectable()
export class Logger implements LoggerService {
  private static lastTimestamp?: number;
  private static instance?: typeof Logger | LoggerService = Logger;

  constructor(
    @Optional() private readonly context?: string,
    @Optional() private readonly isTimestampEnabled = false,
  ) {}

  error(message: any, trace = '', context?: string) {
    const instance = this.getInstance();
    instance &&
      instance.error.call(instance, message, trace, context || this.context);
  }

  log(message: any, context?: string) {
    this.callFunction('log', message, context);
  }

  warn(message: any, context?: string) {
    this.callFunction('warn', message, context);
  }

  debug(message: any, context?: string) {
    this.callFunction('debug', message, context);
  }

  verbose(message: any, context?: string) {
    this.callFunction('verbose', message, context);
  }

  static overrideLogger(logger: LoggerService | boolean) {
    this.instance = isObject(logger) ? (logger as LoggerService) : undefined;
  }

  static log(message: any, context = '', isTimeDiffEnabled = true) {
    this.printMessage(message, clc.green, context, isTimeDiffEnabled);
  }

  static error(
    message: any,
    trace = '',
    context = '',
    isTimeDiffEnabled = true,
  ) {
    this.printMessage(message, clc.red, context, isTimeDiffEnabled);
    this.printStackTrace(trace);
  }

  static warn(message: any, context = '', isTimeDiffEnabled = true) {
    this.printMessage(message, clc.yellow, context, isTimeDiffEnabled);
  }

  static debug(message: any, context = '', isTimeDiffEnabled = true) {
    this.printMessage(message, clc.magentaBright, context, isTimeDiffEnabled);
  }

  static verbose(message: any, context = '', isTimeDiffEnabled = true) {
    this.printMessage(message, clc.cyanBright, context, isTimeDiffEnabled);
  }

  private callFunction(
    name: 'log' | 'warn' | 'debug' | 'verbose',
    message: any,
    context?: string,
  ) {
    const instance = this.getInstance();
    const func = instance && (instance as typeof Logger)[name];
    func &&
      func.call(
        instance,
        message,
        context || this.context,
        this.isTimestampEnabled,
      );
  }

  private getInstance(): typeof Logger | LoggerService {
    const { instance } = Logger;
    return instance === this ? Logger : instance;
  }

  private static printMessage(
    message: any,
    color: (message: string) => string,
    context: string = '',
    isTimeDiffEnabled?: boolean,
  ) {
    const output = isObject(message)
      ? `${color('Object:')}\n${JSON.stringify(message, null, 2)}\n`
      : color(message);

    const localeStringOptions = {
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      day: '2-digit',
      month: '2-digit',
    };
    const timestamp = new Date(Date.now()).toLocaleString(
      undefined,
      localeStringOptions,
    );
    process.stdout.write(color(`[Nest] ${process.pid}   - `));
    process.stdout.write(`${timestamp}   `);

    context && process.stdout.write(yellow(`[${context}] `));
    process.stdout.write(output);

    this.printTimestamp(isTimeDiffEnabled);
    process.stdout.write(`\n`);
  }

  private static printTimestamp(isTimeDiffEnabled?: boolean) {
    const includeTimestamp = Logger.lastTimestamp && isTimeDiffEnabled;
    if (includeTimestamp) {
      process.stdout.write(yellow(` +${Date.now() - Logger.lastTimestamp}ms`));
    }
    Logger.lastTimestamp = Date.now();
  }

  private static printStackTrace(trace: string) {
    if (!trace) {
      return;
    }
    process.stdout.write(trace);
    process.stdout.write(`\n`);
  }
}
