/**
 * @publicApi
 */
export class InvalidPacketIdException extends Error {
  constructor(maxLength: number) {
    super(
      `The packet id must be a number or a string of at most ${maxLength} characters`,
    );
  }
}
