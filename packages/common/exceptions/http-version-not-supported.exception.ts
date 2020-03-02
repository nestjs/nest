import { HttpException } from './http.exception';
import { HttpStatus } from '../enums/http-status.enum';

/**
 * Defines an HTTP exception for *Http Version Not Supported* type errors.
 *
 * @see [Base Exceptions](https://docs.nestjs.com/exception-filters#base-exceptions)
 *
 * @publicApi
 */
export class HttpVersionNotSupportedException extends HttpException {
  /**
   * Instantiate a `HttpVersionNotSupportedException` Exception.
   *
   * @example
   * `throw new HttpVersionNotSupportedException()`
   *
   * @usageNotes
   * The constructor arguments define the HTTP response.
   * - The `message` argument defines the JSON response body.
   * - The `error` argument defines the HTTP Status Code.
   *
   * By default, the JSON response body contains two properties:
   * - `statusCode`: defaults to the Http Status Code provided in the `error` argument
   * - `message`: the string `'HTTP Version Not Supported'` by default; override this by supplying
   * a string in the `message` parameter.
   *
   * To override the entire JSON response body, pass an object.  Nest will serialize
   * the object and return it as the JSON response body.
   *
   * The `error` argument is required, and should be a valid HTTP status code.
   * Best practice is to use the `HttpStatus` enum imported from `nestjs/common`.
   *
   * @param message string or object describing the error condition.
   * @param error HTTP response status code
   */
  constructor(
    message?: string | object | any,
    error = 'HTTP Version Not Supported',
  ) {
    super(
      HttpException.createBody(
        message,
        error,
        HttpStatus.HTTP_VERSION_NOT_SUPPORTED,
      ),
      HttpStatus.HTTP_VERSION_NOT_SUPPORTED,
    );
  }
}
