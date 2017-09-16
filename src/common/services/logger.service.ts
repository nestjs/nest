import * as debug from 'debug';
import * as clc from 'cli-color';
import { NestEnvironment } from '../enums/nest-environment.enum';

declare const process;
type LogLevel = 'LOG' | 'WARN' | 'ERROR';

export class Logger {
    private readonly yellow = clc.xterm(3);
    private readonly logger: debug.IDebugger;

    constructor(private context: string) {
        this.logger = debug(`Nest:${context}`);
    }

    /**
     * only for backward compatibility
     * @deprecated
     */
    public static setMode(mode?: NestEnvironment) {}

    public log(message: string) {
        this.logMessage(message, clc.green, 'LOG');
    }

    public error(message: string, trace = '') {
        this.logMessage(message, clc.red, 'ERROR');
        this.printStackTrace(trace);
    }

    public warn(message: string) {
        this.logMessage(message, clc.yellow, 'WARN');
    }

    private logMessage(message: string, color: (msg: string) => string, level: LogLevel) {
        let output = `[${process.pid}] [${new Date(Date.now()).toLocaleString()}] [${level}]`;
        output += ' - ';
        output += color(message);
        this.logger(output);
    }

    private printStackTrace(trace: string) {
        this.logger(trace);
    }
}