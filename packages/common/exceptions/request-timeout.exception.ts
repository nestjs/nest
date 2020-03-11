import { HttpException } from './http.exception';
import { HttpStatus } from '../enums/http-status.enum';

/**
 * Defines an HTTP exception for *Request Timeout* type errors.
 *
 * @see [Base Exceptions](https://docs.nestjs.com/exception-filters#base-exceptions)
 *
 * @publicApi
 */
export class RequestTimeoutException extends HttpException {
  /**
   * Instantiate a `RequestTimeoutException` Exception.
   *
   * @example
   * `throw new RequestTimeoutException()`
   *
   * @usageNotes
   * The HTTP response status code will be 408.
   * - The `objectOrError` argument defines the JSON response body or the error string.
   * - The `message` argument contains a short description of the HTTP error.
   *
   * By default, the JSON response body contains two properties:
   * - `statusCode`: this will be the value 408.
   * - `message`: the string `'Request Timeout'` by default; override this by supplying
   * a string in the `message` parameter.
   *
   * If the parameter `objectOrError` is a string, the response body will contain an
   * additional property, `error`, containing the given string. To override the
   * entire JSON response body, pass an object instead. Nest will serialize the object
   * and return it as the JSON response body.
   *
   * @param objectOrError string or object describing the error condition.
   * @param message a short description of the HTTP error.
   */
  constructor(
    objectOrError?: string | object | any,
    message = 'Request Timeout',
  ) {
    super(
      HttpException.createBody(
        objectOrError,
        message,
        HttpStatus.REQUEST_TIMEOUT,
      ),
      HttpStatus.REQUEST_TIMEOUT,
    );
  }
}
