import { HttpStatus } from '../enums/http-status.enum';

import { HttpException } from './http.exception';

/**
 * Defines an HTTP exception for *ImATeapotException* type errors.
 *
 * Any attempt to brew coffee with a teapot should result in the error code
 * "418 I'm a teapot". The resulting entity body MAY be short and stout.
 *
 * @see [Base Exceptions](https://docs.nestjs.com/exception-filters#base-exceptions)
 *
 * @publicApi
 */
export class ImATeapotException extends HttpException {
  /**
   * Instantiate an `ImATeapotException` Exception.
   *
   * @example
   * `throw new BadGatewayException()`
   *
   * @usageNotes
   * The HTTP response status code will be 418.
   * - The `objectOrError` argument defines the JSON response body or the message string.
   * - The `description` argument contains a short description of the HTTP error.
   *
   * By default, the JSON response body contains two properties:
   * - `statusCode`: this will be the value 418.
   * - `message`: the string `"I'm a Teapot"` by default; override this by supplying
   * a string in the `objectOrError` parameter.
   *
   * If the parameter `objectOrError` is a string, the response body will contain an
   * additional property, `error`, with a short description of the HTTP error. To override the
   * entire JSON response body, pass an object instead. Nest will serialize the object
   * and return it as the JSON response body.
   *
   * @param objectOrError string or object describing the error condition.
   * @param description a short description of the HTTP error.
   */
  constructor(
    objectOrError?: string | object | any,
    description = `I'm a teapot`,
  ) {
    super(
      HttpException.createBody(
        objectOrError,
        description,
        HttpStatus.I_AM_A_TEAPOT,
      ),
      HttpStatus.I_AM_A_TEAPOT,
    );
  }
}
