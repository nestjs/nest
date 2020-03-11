import { HttpException } from './http.exception';
import { HttpStatus } from '../enums/http-status.enum';

/**
 * Defines an HTTP exception for *Unauthorized* type errors.
 *
 * @see [Base Exceptions](https://docs.nestjs.com/exception-filters#base-exceptions)
 *
 * @publicApi
 */
export class UnauthorizedException extends HttpException {
  /**
   * Instantiate an `UnauthorizedException` Exception.
   *
   * @example
   * `throw new UnauthorizedException()`
   *
   * @usageNotes
   * The HTTP response status code will be 401.
   * - The `objectOrError` argument defines the JSON response body or the error string.
   * - The `message` argument contains a short description of the HTTP error.
   *
   * By default, the JSON response body contains two properties:
   * - `statusCode`: this will be the value 401.
   * - `message`: the string `'Unauthorized'` by default; override this by supplying
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
  constructor(objectOrError?: string | object | any, message = 'Unauthorized') {
    super(
      HttpException.createBody(objectOrError, message, HttpStatus.UNAUTHORIZED),
      HttpStatus.UNAUTHORIZED,
    );
  }
}
