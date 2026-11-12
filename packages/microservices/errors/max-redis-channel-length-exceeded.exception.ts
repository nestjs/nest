/**
 * @publicApi
 */
export class MaxRedisChannelLengthExceededException extends Error {
  constructor(length: number, maxLength: number) {
    super(
      `The Redis channel length (${length} characters) of a request matched by a wildcard pattern exceeds the maximum allowed ${maxLength} characters`,
    );
  }
}
