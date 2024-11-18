/**
 * @publicApi
 */
export class MaxPacketLengthExceededException extends Error {
  constructor(length: number) {
    super(`The packet length (${length}) exceeds the maximum allowed length`);
  }
}
