import { HttpStatus } from '../enums/http-status.enum.js';
import { HttpException, HttpExceptionOptions } from './http.exception.js';

/**
 * Options of a `PayloadTooLargeException`.
 *
 * @publicApi
 */
export interface PayloadTooLargeExceptionOptions extends HttpExceptionOptions {
  /** The size limit that was exceeded, in bytes. */
  limit?: number;
}

/**
 * Defines an HTTP exception for *Payload Too Large* type errors.
 *
 * @see [Built-in HTTP exceptions](https://docs.nestjs.com/exception-filters#built-in-http-exceptions)
 *
 * @publicApi
 */
export class PayloadTooLargeException extends HttpException {
  /**
   * The size limit that was exceeded, in bytes, when it is known: set for a
   * file over `limits.fileSize` by the file upload interceptors, for example.
   * It is not part of the response body.
   */
  declare readonly limit?: number;

  /**
   * Instantiate a `PayloadTooLargeException` Exception.
   *
   * @example
   * `throw new PayloadTooLargeException()`
   * `throw new PayloadTooLargeException('File too large', { limit: 1024 })`
   *
   * @usageNotes
   * The HTTP response status code will be 413.
   * - The `objectOrError` argument defines the JSON response body or the message string.
   * - The `descriptionOrOptions` argument contains either a short description of the HTTP error
   *   or an options object used to provide an underlying error cause and the size `limit` that
   *   was exceeded, in bytes.
   *
   * By default, the JSON response body contains two properties:
   * - `statusCode`: this will be the value 413.
   * - `message`: the string `'Payload Too Large'` by default; override this by supplying
   * a string in the `objectOrError` parameter.
   *
   * If the parameter `objectOrError` is a string, the response body will contain an
   * additional property, `error`, with a short description of the HTTP error. To override the
   * entire JSON response body, pass an object instead. Nest will serialize the object
   * and return it as the JSON response body.
   *
   * @param objectOrError string or object describing the error condition.
   * @param descriptionOrOptions either a short description of the HTTP error or an options
   * object used to provide an underlying error cause and the size limit
   */
  constructor(
    objectOrError?: any,
    descriptionOrOptions:
      string | PayloadTooLargeExceptionOptions = 'Payload Too Large',
  ) {
    const { description = 'Payload Too Large', httpExceptionOptions } =
      HttpException.extractDescriptionAndOptionsFrom(descriptionOrOptions);
    const { limit, ...options }: PayloadTooLargeExceptionOptions =
      httpExceptionOptions ?? {};

    super(
      HttpException.createBody(
        objectOrError,
        description,
        HttpStatus.PAYLOAD_TOO_LARGE,
        httpExceptionOptions?.errorCode,
      ),
      HttpStatus.PAYLOAD_TOO_LARGE,
      options,
    );
    if (limit !== undefined) {
      this.limit = limit;
    }
  }
}
