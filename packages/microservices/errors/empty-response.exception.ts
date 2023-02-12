/**
 * @publicApi
 */
export class EmptyResponseException extends Error {
  constructor(pattern: string) {
    super(
      `Empty response. There are no subscribers listening to that message ("${pattern}")`,
    );
  }
}
