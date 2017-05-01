import { NestEnvironment } from '../enums/nest-environment.enum';

declare const process;
import * as clc from 'cli-color';

export class Logger {
    private static mode = NestEnvironment.RUN;
    private readonly yellow = clc.xterm(3);

    constructor(private context: string) {}

    public static setMode(mode: NestEnvironment) {
        this.mode = mode;
    }

    public log(message: string) {
        this.logMessage(message, clc.green);
    }

    public error(message: string, trace = '') {
        this.logMessage(message, clc.red);
        this.printStackTrace(trace);
    }

    public warn(message: string) {
        this.logMessage(message, clc.yellow);
    }

    private logMessage(message: string, color: (msg: string) => string) {
        if (Logger.mode === NestEnvironment.TEST) return;

        process.stdout.write(color(`[Nest] ${process.pid}   - `));
        process.stdout.write(`${new Date(Date.now()).toLocaleString()}   `);
        process.stdout.write(this.yellow(`[${this.context}] `));
        process.stdout.write(color(message));
        process.stdout.write(`\n`);
    }

    private printStackTrace(trace: string) {
        if (Logger.mode === NestEnvironment.TEST) return;

        process.stdout.write(trace);
        process.stdout.write(`\n`);
    }
}