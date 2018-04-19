export declare class RpcException extends Error {
    private readonly error;
    readonly message: any;
    constructor(error: string | object);
    getError(): string | object;
}
