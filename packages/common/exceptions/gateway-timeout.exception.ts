import { HttpException } from './http.exception';
import { HttpStatus } from '../enums/http-status.enum';

/**
 * Defines an HTTP exception for *Gatway Timeout* type errors.
 *
 * @see [Base Exceptions](https://docs.nestjs.com/exception-filters#base-exceptions)
 *
 * @publicApi
 */
export class GatewayTimeoutException extends HttpException {
  /**
   * Instantiate a `GatewayTimeoutException` Exception.
   *
   * @example
   * `throw new GatewayTimeoutException()`
   *
   * @usageNotes
   * The HTTP response status code will be 504.
   * - The `objectOrError` argument defines the JSON response body or the error string.
   * - The `message` argument contains a short description of the HTTP error.
   *
   * By default, the JSON response body contains two properties:
   * - `statusCode`: this will be the value 504.
   * - `message`: the string `'Gateway Timeout'` by default; override this by supplying
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
    message = 'Gateway Timeout',
  ) {
    super(
      HttpException.createBody(
        objectOrError,
        message,
        HttpStatus.GATEWAY_TIMEOUT,
      ),
      HttpStatus.GATEWAY_TIMEOUT,
    );
  }
}
