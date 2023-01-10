import { HttpStatus } from '../enums/http-status.enum';
import { HttpException, HttpExceptionOptions } from './http.exception';

/**
 * Defines an HTTP exception for *Unprocessable Entity* type errors.
 *
 * @see [Built-in HTTP exceptions](https://docs.nestjs.com/exception-filters#built-in-http-exceptions)
 *
 * @publicApi
 */
export class UnprocessableEntityException extends HttpException {
  /**
   * Instantiate an `UnprocessableEntityException` Exception.
   *
   * @example
   * `throw new UnprocessableEntityException()`
   *
   * @usageNotes
   * The HTTP response status code will be 422.
   * - The `objectOrError` argument defines the JSON response body or the message string.
   * - The `descriptionOrOptions` argument contains either a short description of the HTTP error or an options object used to provide an underlying error cause.
   *
   * By default, the JSON response body contains two properties:
   * - `statusCode`: this will be the value 422.
   * - `message`: the string `'Unprocessable Entity'` by default; override this by supplying
   * a string in the `objectOrError` parameter.
   *
   * If the parameter `objectOrError` is a string, the response body will contain an
   * additional property, `error`, with a short description of the HTTP error. To override the
   * entire JSON response body, pass an object instead. Nest will serialize the object
   * and return it as the JSON response body.
   *
   * @param objectOrError string or object describing the error condition.
   * @param descriptionOrOptions either a short description of the HTTP error or an options object used to provide an underlying error cause
   */
  constructor(
    objectOrError?: string | object | any,
    descriptionOrOptions:
      | string
      | HttpExceptionOptions = 'Unprocessable Entity',
  ) {
    const { description, httpExceptionOptions } =
      HttpException.extractDescriptionAndOptionsFrom(descriptionOrOptions);

    super(
      HttpException.createBody(
        objectOrError,
        description,
        HttpStatus.UNPROCESSABLE_ENTITY,
      ),
      HttpStatus.UNPROCESSABLE_ENTITY,
      httpExceptionOptions,
    );
  }
}
