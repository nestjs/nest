export declare class RpcException {
    private readonly error;
    constructor(error: string | object);
    getError(): string | object;
}
