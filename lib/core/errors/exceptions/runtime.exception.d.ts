export declare class Error {
    name: string;
    message: string;
    stack: string;
    constructor(message?: string);
}
export declare class RuntimeException extends Error {
    private msg;
    constructor(msg?: string);
    what(): string;
}
