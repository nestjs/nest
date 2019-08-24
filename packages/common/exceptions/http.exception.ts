import { isString, isObject } from '../utils/shared.utils';

export class HttpException extends Error {
  public readonly message: any;

  /**
   * Base Nest application exception, which is handled by the default Exceptions Handler.
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
   */
  constructor(
    private readonly response: string | object,
    private readonly status: number,
  ) {
    super();
    this.message = response;
  }

  public getResponse(): string | object {
    return this.response;
  }

  public getStatus(): number {
    return this.status;
  }

  public toString(): string {
    const message = this.getErrorString(this.message);
    return `Error: ${message}`;
  }

  private getErrorString(target: string | object): string {
    return isString(target) ? target : JSON.stringify(target);
  }

  public static createBody = (
    message: object | string,
    error?: string,
    statusCode?: number,
  ) => {
    if (!message) {
      return { statusCode, error };
    }
    return isObject(message) && !Array.isArray(message)
      ? message
      : { statusCode, error, message };
  }
}
