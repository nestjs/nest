/**
 * @publicApi
 */
export class ClientRequestTimeoutException extends Error {
  constructor(public readonly timeoutMs: number) {
    super(`Microservice request timed out after ${timeoutMs}ms`);
    this.name = ClientRequestTimeoutException.name;
  }
}
