import { isObject, isString } from '../utils/shared.utils';

/**
 * Defines the base Nest HTTP exception, which is handled by the default
 * Exceptions Handler.
 *
 * @see [Base Exceptions](https://docs.nestjs.com/exception-filters#base-exceptions)
 *
 * @publicApi
 */
export class HttpException extends Error {
  public readonly message: any;
  /**
   * Instantiate a plain HTTP Exception.
   *
   * @example
   * `throw new HttpException()`
   *
   * @usageNotes
   * The constructor arguments define the HTTP response.
   * - The `response` argument (required) defines the JSON response body.
   * - The `status` argument (required) defines the HTTP Status Code.
   *
   * By default, the JSON response body contains two properties:
   * - `statusCode`: defaults to the Http Status Code provided in the `error` argument
   * - `message`: a short description of the HTTP error by default; override this
   * by supplying a string in the `response` parameter.
   *
   * To override the entire JSON response body, pass an object.  Nest will serialize
   * the object and return it as the JSON response body.
   *
   * The `status` argument is required, and should be a valid HTTP status code.
   * Best practice is to use the `HttpStatus` enum imported from `nestjs/common`.
   *
   * @param response string or object describing the error condition.
   * @param status HTTP response status code
   */
  constructor(
    private readonly response: string | object,
    private readonly status: number,
  ) {
    super();
    this.message = response;
  }

  public getResponse(): string | object {
    return this.response;
  }

  public getStatus(): number {
    return this.status;
  }

  public toString(): string {
    const message = this.getErrorString(this.message);
    return `Error: ${message}`;
  }

  private getErrorString(target: string | object): string {
    return isString(target) ? target : JSON.stringify(target);
  }

  public static createBody(
    message: object | string,
    error?: string,
    statusCode?: number,
  ) {
    if (!message) {
      return { statusCode, message: error, error };
    }
    return isObject(message) && !Array.isArray(message)
      ? message
      : { statusCode, error, message };
  }
}
