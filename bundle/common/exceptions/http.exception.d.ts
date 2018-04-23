export declare class HttpException extends Error {
    private readonly response;
    private readonly status;
    readonly message: any;
    /**
     * The base Nest Application exception, which is handled by the default Exceptions Handler.
     * If you throw an exception from your HTTP route handlers, Nest will map them to the appropriate HTTP response and send to the client.
     *
     * When `response` is an object:
     * - object will be stringified and returned to the user as a JSON response,
     *
     * When `response` is a string:
     * - Nest will create a response with two properties:
     * ```
     * message: response,
     * statusCode: X
     * ```
     */
    constructor(response: string | object, status: number);
    getResponse(): string | object;
    getStatus(): number;
}
