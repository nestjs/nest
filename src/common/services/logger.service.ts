import { NestMode } from '../enums/nest-mode.enum';

declare var process;
import * as clc from 'cli-color';

export class Logger {
    private static mode = NestMode.RUN;
    private readonly yellow = clc.xterm(3);

    constructor(private context: string) {}

    static setMode(mode: NestMode) {
        this.mode = mode;
    }

    log(message: string) {
        this.logMessage(message, clc.green);
    }

    error(message: string, trace = '') {
        this.logMessage(message, clc.red);
        this.printStackTrace(trace);
    }

    warn(message: string) {
        this.logMessage(message, clc.yellow);
    }

    private logMessage(message: string, color: Function) {
        if (Logger.mode === NestMode.TEST) { return; }

        process.stdout.write(color(`[Nest] ${process.pid}   - `));
        process.stdout.write(`${new Date(Date.now()).toLocaleString()}   `);
        process.stdout.write(this.yellow(`[${this.context}] `));
        process.stdout.write(color(message));
        process.stdout.write(`\n`);
    }

    private printStackTrace(trace: string) {
        if (Logger.mode === NestMode.TEST) { return; }

        process.stdout.write(trace);
        process.stdout.write(`\n`);
    }
}