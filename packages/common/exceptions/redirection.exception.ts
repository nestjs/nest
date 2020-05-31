import { HttpException } from './http.exception';

/**
 * Defines an HTTP exception for *Redirection* type errors which should result in
 * the client being redirected to a different location (URI).
 *
 * @see [Base Exceptions](https://docs.nestjs.com/exception-filters#base-exceptions)
 *
 * @publicApi
 */
export class RedirectionException extends HttpException {
  /**
   * Instantiate a `RedirectionException` Exception.
   *
   * @example
   * `throw new RedirectionException(location)`
   *
   * @usageNotes
   * The constructor arguments define the location and the HTTP response status code.
   * - The `location` argument (required) defines the URI to redirect the client to.
   * - The `status` argument defines the HTTP Status Code.  It should be a 3xx code.
   *
   * @param location string indicating the url to redirect the user to.
   * @param status HTTP response status code.  It should be a 3xx status code.
   */
  constructor(response: string, private location: string, status = 302) {
    super(response, status);
  }

  public getLocation(): string {
    return this.location;
  }
}
