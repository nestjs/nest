/**
 * @publicApi
 */
export class MessageReceiveTimeoutException extends Error {
  constructor(bufferedLength: number, timeout: number) {
    super(
      `The remote peer did not finish sending a packet within ${timeout}ms (${bufferedLength} character(s) buffered)`,
    );
  }
}
