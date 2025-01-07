import { HttpStatus } from '../enums/http-status.enum';
import { HttpException, HttpExceptionOptions } from './http.exception';

/**
 * Defines an HTTP exception for *Http Version Not Supported* type errors.
 *
 * @see [Built-in HTTP exceptions](https://docs.nestjs.com/exception-filters#built-in-http-exceptions)
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
   * The HTTP response status code will be 505.
   * - The `objectOrError` argument defines the JSON response body or the message string.
   * - The `descriptionOrOptions` argument contains either a short description of the HTTP error or an options object used to provide an underlying error cause.
   *
   * By default, the JSON response body contains two properties:
   * - `statusCode`: this will be the value 505.
   * - `message`: the string `'HTTP Version Not Supported'` by default; override this by supplying
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
    objectOrError?: any,
    descriptionOrOptions:
      | string
      | HttpExceptionOptions = 'HTTP Version Not Supported',
  ) {
    const { description, httpExceptionOptions } =
      HttpException.extractDescriptionAndOptionsFrom(descriptionOrOptions);

    super(
      HttpException.createBody(
        objectOrError,
        description!,
        HttpStatus.HTTP_VERSION_NOT_SUPPORTED,
      ),
      HttpStatus.HTTP_VERSION_NOT_SUPPORTED,
      httpExceptionOptions,
    );
  }
}
