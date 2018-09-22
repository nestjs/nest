import * as clc from 'cli-color';
import { Injectable, Optional } from '../decorators';
import { NestEnvironment } from '../enums/nest-environment.enum';
import { isObject } from '../utils/shared.utils';

declare const process;

export interface LoggerService {
  log(message: any, context?: string);
  error(message: any, trace?: string, context?: string);
  warn(message: any, context?: string);
}

@Injectable()
export class Logger implements LoggerService {
  private static prevTimestamp?: number;
  private static contextEnvironment = NestEnvironment.RUN;
  private static logger?: typeof Logger | LoggerService = Logger;
  private static readonly yellow = clc.xterm(3);

  constructor(
    @Optional() private readonly context?: string,
    @Optional() private readonly isTimeDiffEnabled = false,
  ) {}

  log(message: any, context?: string) {
    const { logger } = Logger;
    if (logger === this) {
      Logger.log(message, context || this.context, this.isTimeDiffEnabled);
      return;
    }
    logger && logger.log.call(logger, message, context || this.context);
  }

  error(message: any, trace = '', context?: string) {
    const { logger } = Logger;
    if (logger === this) {
      Logger.error(message, trace, context || this.context);
      return;
    }
    logger &&
      logger.error.call(logger, message, trace, context || this.context);
  }

  warn(message: any, context?: string) {
    const { logger } = Logger;
    if (logger === this) {
      Logger.warn(message, context || this.context, this.isTimeDiffEnabled);
      return;
    }
    logger && logger.warn.call(logger, message, context || this.context);
  }

  static overrideLogger(logger: LoggerService | boolean) {
    this.logger = logger ? (logger as LoggerService) : undefined;
  }

  static setMode(mode: NestEnvironment) {
    this.contextEnvironment = mode;
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

  private static printMessage(
    message: any,
    color: (message: string) => string,
    context: string = '',
    isTimeDiffEnabled?: boolean,
  ) {
    if (Logger.contextEnvironment === NestEnvironment.TEST) {
      return void 0;
    }
    const output =
      message && isObject(message) ? JSON.stringify(message, null, 2) : message;
    process.stdout.write(color(`[Nest] ${process.pid}   - `));
    process.stdout.write(`${new Date(Date.now()).toLocaleString()}   `);

    context && process.stdout.write(this.yellow(`[${context}] `));
    process.stdout.write(color(output));

    this.printTimestamp(isTimeDiffEnabled);
    process.stdout.write(`\n`);
  }

  private static printTimestamp(isTimeDiffEnabled?: boolean) {
    const includeTimestamp = Logger.prevTimestamp && isTimeDiffEnabled;
    if (includeTimestamp) {
      process.stdout.write(
        this.yellow(` +${Date.now() - Logger.prevTimestamp}ms`),
      );
    }
    Logger.prevTimestamp = Date.now();
  }

  private static printStackTrace(trace: string) {
    if (this.contextEnvironment === NestEnvironment.TEST || !trace) {
      return void 0;
    }
    process.stdout.write(trace);
    process.stdout.write(`\n`);
  }
}
