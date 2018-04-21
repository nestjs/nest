import { NestEnvironment } from '../enums/nest-environment.enum';
export interface LoggerService {
    log(message: string): any;
    error(message: string, trace: string): any;
    warn(message: string): any;
}
export declare class Logger implements LoggerService {
    private readonly context;
    private readonly isTimeDiffEnabled;
    private static prevTimestamp;
    private static contextEnv;
    private static logger;
    private static readonly yellow;
    constructor(context: string, isTimeDiffEnabled?: boolean);
    log(message: string): void;
    error(message: string, trace?: string): void;
    warn(message: string): void;
    static overrideLogger(logger: LoggerService | boolean): void;
    static setMode(mode: NestEnvironment): void;
    static log(message: string, context?: string, isTimeDiffEnabled?: boolean): void;
    static error(message: string, trace?: string, context?: string, isTimeDiffEnabled?: boolean): void;
    static warn(message: string, context?: string, isTimeDiffEnabled?: boolean): void;
    private static printMessage(message, color, context?, isTimeDiffEnabled?);
    private static printTimestamp(isTimeDiffEnabled?);
    private static printStackTrace(trace);
}
