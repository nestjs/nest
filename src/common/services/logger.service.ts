import * as clc from 'cli-color';
import { NestEnvironment } from '../enums/nest-environment.enum';

declare const process;

export class Logger {
  private static lastTimestamp = null;
  private static contextEnv = NestEnvironment.RUN;
  private readonly yellow = clc.xterm(3);

  constructor(
    private readonly context: string,
    private readonly printTimestamps = false
  ) {}

  public static setMode(mode: NestEnvironment) {
    this.contextEnv = mode;
  }

  public log(message: string) {
    this.printMessage(message, clc.green);
  }

  public error(message: string, trace = '') {
    this.printMessage(message, clc.red);
    this.printStackTrace(trace);
  }

  public warn(message: string) {
    this.printMessage(message, clc.yellow);
  }

  private printMessage(message: string, color: (msg: string) => string) {
    if (Logger.contextEnv === NestEnvironment.TEST) return;

    process.stdout.write(color(`[Nest] ${process.pid}   - `));
    process.stdout.write(`${new Date(Date.now()).toLocaleString()}   `);
    process.stdout.write(this.yellow(`[${this.context}] `));
    process.stdout.write(color(message));

    this.printTimestamp();
    process.stdout.write(`\n`);
  }

  private printTimestamp() {
    const includeTimestamp = Logger.lastTimestamp && this.printTimestamps;
    if (includeTimestamp) {
      process.stdout.write(
        this.yellow(` +${Date.now() - Logger.lastTimestamp}ms`)
      );
    }
    Logger.lastTimestamp = Date.now();
  }

  private printStackTrace(trace: string) {
    if (Logger.contextEnv === NestEnvironment.TEST || !trace) return;

    process.stdout.write(trace);
    process.stdout.write(`\n`);
  }
}
