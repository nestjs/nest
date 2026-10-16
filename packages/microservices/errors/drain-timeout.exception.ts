/**
 * @publicApi
 */
export class DrainTimeoutException extends Error {
  constructor(bufferedBytes: number, timeout: number) {
    super(
      `The remote peer is not reading its responses: ${bufferedBytes} byte(s) are queued for it and none of them were written out in the last ${timeout}ms`,
    );
  }
}
