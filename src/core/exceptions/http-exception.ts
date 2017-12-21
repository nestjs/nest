import { Logger } from '@nestjs/common';

export class HttpException {
  private readonly logger = new Logger(HttpException.name);

  /**
   * The base Nest Application exception, which is handled by the default Exceptions Handler.
   * If you throw an exception from your HTTP route handlers, Nest will map them to the appropriate HTTP response and send to the client.
   *
   * When `response` is an object:
   * - object will be stringified and returned to the user as a JSON response,
   *
   * When `response` is a string:
   * - Nest will create a response with two properties:
   * ```
   * message: response,
   * statusCode: X
   * ```
   * @deprecated
   */
  constructor(
    private readonly response: string | object,
    private readonly status: number
  ) {
    this.logger.warn(
      'DEPRECATED! Since version [4.3.2] HttpException class was moved to the @nestjs/common package!'
    );
  }

  public getResponse(): string | object {
    return this.response;
  }

  public getStatus(): number {
    return this.status;
  }
}
