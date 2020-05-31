import { HttpStatus } from '../enums/http-status.enum';
import { RedirectionException } from './redirection.exception';

/**
 * Defines an HTTP exception for *Found* (formerly *MovedTemporarily*) type redirection errors.
 *
 * @see [Base Exceptions](https://docs.nestjs.com/exception-filters#base-exceptions)
 *
 * @publicApi
 */
export class FoundException extends RedirectionException {
  /**
   * Instantiate a `FoundException` Exception.
   *
   * @example
   * `throw new FoundException(location)`
   *
   * @usageNotes
   * The HTTP response status code will be 302.
   * - The `location` argument indicates where the user should be redirected to.
   *
   * @param location string indicating the url to redirect the user to.
   */
  constructor(location: string) {
    super('Found', location, HttpStatus.FOUND);
  }
}
