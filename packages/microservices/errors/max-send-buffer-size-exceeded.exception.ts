/**
 * @publicApi
 */
export class MaxSendBufferSizeExceededException extends Error {
  constructor(bufferedBytes: number, maxBufferSize: number) {
    super(
      `The remote peer is not reading its responses: ${bufferedBytes} byte(s) are queued for it, which exceeds the maximum allowed ${maxBufferSize}`,
    );
  }
}
