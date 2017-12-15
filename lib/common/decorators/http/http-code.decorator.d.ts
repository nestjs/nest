/**
 * Defines the HTTP status code, which should be sent with response.
 * It overrides default status code for the given request method.
 *
 * @param  {number} statusCode
 */
export declare function HttpCode(statusCode: number): MethodDecorator;
