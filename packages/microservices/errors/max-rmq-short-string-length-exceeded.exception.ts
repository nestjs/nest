/**
 * @publicApi
 */
export class MaxRmqShortStringLengthExceededException extends Error {
  constructor(field: string, length: number, maxLength: number) {
    super(
      `The RMQ ${field} length (${length} bytes) exceeds the maximum allowed ${maxLength} bytes`,
    );
  }
}
