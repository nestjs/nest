import { HttpStatus } from '../enums/http-status.enum';
import { RedirectionException } from './redirection.exception';

/**
 * Defines an HTTP exception for *Temporary Redirect* type redirection errors.
 *
 * @see [Base Exceptions](https://docs.nestjs.com/exception-filters#base-exceptions)
 *
 * @publicApi
 */
export class TemporaryRedirectException extends RedirectionException {
  /**
   * Instantiate a `TemporaryRedirectException` Exception.
   *
   * @example
   * `throw new TemporaryRedirectException(location)`
   *
   * @usageNotes
   * The HTTP response status code will be 307.
   * - The `location` argument indicates where the user should be redirected to.
   *
   * @param location string indicating the url to redirect the user to.
   */
  constructor(location: string) {
    super('Temporary Redirect', location, HttpStatus.TEMPORARY_REDIRECT);
  }
}
