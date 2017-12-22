import { NestEnvironment } from '../enums/nest-environment.enum';
export declare class Logger {
    private readonly context;
    private readonly printTimestamps;
    private static lastTimestamp;
    private static contextEnv;
    private readonly yellow;
    constructor(context: string, printTimestamps?: boolean);
    static setMode(mode: NestEnvironment): void;
    log(message: string): void;
    error(message: string, trace?: string): void;
    warn(message: string): void;
    private printMessage(message, color);
    private printTimestamp();
    private printStackTrace(trace);
}
