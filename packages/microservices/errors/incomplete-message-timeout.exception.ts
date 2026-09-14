/**
 * @publicApi
 */
export class IncompleteMessageTimeoutException extends Error {
  constructor(bufferedLength: number, timeout: number) {
    super(
      `The remote peer stopped sending in the middle of a packet (${bufferedLength} character(s) buffered) and did not send anything for ${timeout}ms`,
    );
  }
}
