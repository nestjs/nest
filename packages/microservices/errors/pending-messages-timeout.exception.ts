/**
 * @publicApi
 */
export class PendingMessagesTimeoutException extends Error {
  constructor(bufferedLength: number, timeout: number) {
    super(
      `The remote peer has too many messages being handled: reading from it was suspended and none of them settled in the last ${timeout}ms (${bufferedLength} character(s) waiting)`,
    );
  }
}
