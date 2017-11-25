export declare class ExceptionsZone {
    private static readonly exceptionHandler;
    static run(fn: () => void): void;
    static asyncRun(fn: () => Promise<void>): Promise<void>;
}
