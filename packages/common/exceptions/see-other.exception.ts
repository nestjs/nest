import { HttpStatus } from '../enums/http-status.enum';
import { RedirectionException } from './redirection.exception';

/**
 * Defines an HTTP exception for *See Other* type redirection errors.
 *
 * @see [Base Exceptions](https://docs.nestjs.com/exception-filters#base-exceptions)
 *
 * @publicApi
 */
export class SeeOtherException extends RedirectionException {
  /**
   * Instantiate a `SeeOtherException` Exception.
   *
   * @example
   * `throw new SeeOtherException(location)`
   *
   * @usageNotes
   * The HTTP response status code will be 303.
   * - The `location` argument indicates where the user should be redirected to.
   *
   * @param location string indicating the url to redirect the user to.
   */
  constructor(location: string) {
    super('See Other', location, HttpStatus.SEE_OTHER);
  }
}
