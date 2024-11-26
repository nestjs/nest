import { HttpStatus } from '../enums/http-status.enum';
import { HttpException, HttpExceptionOptions } from './http.exception';

/**
 * Defines an HTTP exception for *Not Implemented* type errors.
 *
 * @see [Built-in HTTP exceptions](https://docs.nestjs.com/exception-filters#built-in-http-exceptions)
 *
 * @publicApi
 */
export class NotImplementedException extends HttpException {
  /**
   * Instantiate a `NotImplementedException` Exception.
   *
   * @example
   * `throw new NotImplementedException()`
   *
   * @usageNotes
   * The HTTP response status code will be 501.
   * - The `objectOrError` argument defines the JSON response body or the message string.
   * - The `descriptionOrOptions` argument contains either a short description of the HTTP error or an options object used to provide an underlying error cause.
   *
   * By default, the JSON response body contains two properties:
   * - `statusCode`: this will be the value 501.
   * - `message`: the string `'Not Implemented'` by default; override this by supplying
   * a string in the `objectOrError` parameter.
   *
   * If the parameter `objectOrError` is a string, the response body will contain an
   * additional property, `error`, with a short description of the HTTP error. To override the
   * entire JSON response body, pass an object instead. Nest will serialize the object
   * and return it as the JSON response body.
   *
   * @param descriptionOrOptions either a short description of the HTTP error or an options object used to provide an underlying error cause
   * @param error a short description of the HTTP error.
   */
  constructor(
    objectOrError?: any,
    descriptionOrOptions: string | HttpExceptionOptions = 'Not Implemented',
  ) {
    const { description, httpExceptionOptions } =
      HttpException.extractDescriptionAndOptionsFrom(descriptionOrOptions);

    super(
      HttpException.createBody(
        objectOrError,
        description!,
        HttpStatus.NOT_IMPLEMENTED,
      ),
      HttpStatus.NOT_IMPLEMENTED,
      httpExceptionOptions,
    );
  }
}
