import { NestEnvironment } from '../enums/nest-environment.enum';
export interface LoggerService {
    log(message: any, context?: string): any;
    error(message: any, trace?: string, context?: string): any;
    warn(message: any, context?: string): any;
}
export declare class Logger implements LoggerService {
    private readonly context;
    private readonly isTimeDiffEnabled;
    private static prevTimestamp?;
    private static contextEnvironment;
    private static logger?;
    private static readonly yellow;
    constructor(context?: string, isTimeDiffEnabled?: boolean);
    log(message: any, context?: string): void;
    error(message: any, trace?: string, context?: string): void;
    warn(message: any, context?: string): void;
    static overrideLogger(logger: LoggerService | boolean): void;
    static setMode(mode: NestEnvironment): void;
    static log(message: any, context?: string, isTimeDiffEnabled?: boolean): void;
    static error(message: any, trace?: string, context?: string, isTimeDiffEnabled?: boolean): void;
    static warn(message: any, context?: string, isTimeDiffEnabled?: boolean): void;
    private static printMessage(message, color, context?, isTimeDiffEnabled?);
    private static printTimestamp(isTimeDiffEnabled?);
    private static printStackTrace(trace);
}
