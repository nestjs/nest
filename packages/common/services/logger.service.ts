import * as clc from 'cli-color';
import * as asciify from 'asciify-image';
import { Injectable } from '../decorators/core/injectable.decorator';
import { Optional } from '../decorators/core/optional.decorator';
import { isObject } from '../utils/shared.utils';

declare const process: any;
const yellow = clc.xterm(3);

export type LogLevel = 'log' | 'error' | 'warn' | 'debug' | 'verbose';

export interface LoggerService {
  log(message: any, context?: string);
  error(message: any, trace?: string, context?: string);
  warn(message: any, context?: string);
  debug?(message: any, context?: string);
  verbose?(message: any, context?: string);
}

@Injectable()
export class Logger implements LoggerService {
  private static logLevels: LogLevel[] = [
    'log',
    'error',
    'warn',
    'debug',
    'verbose',
  ];
  private static lastTimestamp?: number;
  private static instance?: typeof Logger | LoggerService = Logger;

  constructor(
    @Optional() protected context?: string,
    @Optional() private readonly isTimestampEnabled = false,
  ) {}

  error(message: any, trace = '', context?: string) {
    const instance = this.getInstance();
    if (!this.isLogLevelEnabled('error')) {
      return;
    }
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

  setContext(context: string) {
    this.context = context;
  }

  static overrideLogger(logger: LoggerService | LogLevel[] | boolean) {
    if (Array.isArray(logger)) {
      this.logLevels = logger;
      return;
    }
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
    if (!this.isLogLevelEnabled(name)) {
      return;
    }
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

  private isLogLevelEnabled(level: LogLevel): boolean {
    return Logger.logLevels.includes(level);
  }

  private static printMessage(
    message: any,
    color: (message: string) => string,
    context = '',
    isTimeDiffEnabled?: boolean,
  ) {
    const output = isObject(message)
      ? `${color('Object:')}\n${JSON.stringify(message, null, 2)}\n`
      : color(message);

    const localeStringOptions = {
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      day: '2-digit',
      month: '2-digit',
    };
    const timestamp = new Date(Date.now()).toLocaleString(
      undefined,
      localeStringOptions,
    );

    const pidMessage = color(`[Nest] ${process.pid}   - `);
    const contextMessage = context ? yellow(`[${context}] `) : '';
    const timestampDiff = this.updateAndGetTimestampDiff(isTimeDiffEnabled);

    const cats = [
      'https://media.discordapp.net/attachments/679231901109714945/694913437012328498/IMG_20200401_104255.jpg?width=786&height=590',
      'https://media.discordapp.net/attachments/679231901109714945/694390661159452712/unknown.png',
      'https://media.discordapp.net/attachments/679231901109714945/693915212558106704/IMG_20200327_131103658.jpg?width=510&height=590',
      'https://media.discordapp.net/attachments/679231901109714945/693046214463062097/WhatsApp_Image_2020-03-26_at_20.12.26.jpeg?width=786&height=590',
      'https://media.discordapp.net/attachments/679231901109714945/686478269629202444/unknown.png?width=507&height=589',
      'https://media.discordapp.net/attachments/679231901109714945/686333237135671332/IMG_20180818_145914733_LL.jpg?width=649&height=590',
      'https://media.discordapp.net/attachments/679231901109714945/686257945092423722/P1001056.JPG?width=393&height=590',
      'https://media.discordapp.net/attachments/679231901109714945/686257851814903812/P1001050-2.jpg?width=439&height=589',
      'https://media.discordapp.net/attachments/679231901109714945/680836016004661258/202002097464249616562669692.jpg?width=303&height=589',
      'https://media.discordapp.net/attachments/679231901109714945/680339240894464001/IMG_20200102_162210.jpg?width=786&height=590',
      'https://media.discordapp.net/attachments/679231901109714945/680337515080581147/received_1772439086220969.jpeg?width=786&height=590',
      'https://media.discordapp.net/attachments/679231901109714945/680176398186577979/IMG_20200216_202636.jpg?width=332&height=590',
      'https://media.discordapp.net/attachments/679231901109714945/680098182625361951/IMG_20180907_142158.jpg?width=332&height=590',
      'https://media.discordapp.net/attachments/679231901109714945/679965910127345712/unknown.png?width=787&height=590',
      'https://media.discordapp.net/attachments/679231901109714945/679392244238909451/IMG_6932.jpeg?width=442&height=590',
      'https://media.discordapp.net/attachments/679231901109714945/679250502789234708/IMG_20191127_094910337.jpg?width=786&height=590',
      'https://media.discordapp.net/attachments/679231901109714945/679250226384601098/IMG_20190408_131906409.jpg?width=442&height=590',
      'https://media.discordapp.net/attachments/679231901109714945/679232485074272256/image0.png?width=465&height=590',
    ];
    const randomIndex = Math.round(Math.random() * (cats.length - 1));

    asciify(
      cats[randomIndex],
      { fit: 'box', width: 50, height: 50 },
      (_, converted) => {
        process.stdout.write(converted + '\n');
        process.stdout.write(
          `${pidMessage}${timestamp}   ${contextMessage}${output}${timestampDiff}\n`,
        );
      },
    );
  }

  private static updateAndGetTimestampDiff(
    isTimeDiffEnabled?: boolean,
  ): string {
    const includeTimestamp = Logger.lastTimestamp && isTimeDiffEnabled;
    const result = includeTimestamp
      ? yellow(` +${Date.now() - Logger.lastTimestamp}ms`)
      : '';
    Logger.lastTimestamp = Date.now();
    return result;
  }

  private static printStackTrace(trace: string) {
    if (!trace) {
      return;
    }
    process.stdout.write(`${trace}\n`);
  }
}
