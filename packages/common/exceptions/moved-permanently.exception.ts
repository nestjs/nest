import { HttpStatus } from '../enums/http-status.enum';
import { RedirectionException } from './redirection.exception';

/**
 * Defines an HTTP exception for *Moved Permanently* type redirection errors.
 *
 * @see [Base Exceptions](https://docs.nestjs.com/exception-filters#base-exceptions)
 *
 * @publicApi
 */
export class MovedPermanentlyException extends RedirectionException {
  /**
   * Instantiate a `MovedPermanentlyException` Exception.
   *
   * @example
   * `throw new MovedPermanentlyException(location)`
   *
   * @usageNotes
   * The HTTP response status code will be 301.
   * - The `location` argument indicates where the user should be redirected to.
   *
   * @param location string indicating the url to redirect the user to.
   */
  constructor(location: string) {
    super('Moved Permanently', location, HttpStatus.MOVED_PERMANENTLY);
  }
}
