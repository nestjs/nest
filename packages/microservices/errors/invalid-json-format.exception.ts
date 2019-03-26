export class InvalidJSONFormatException extends Error {
  constructor(err: Error, data: string) {
    super(`Could not parse JSON: ${err.message}\nRequest data: ${data}`);
  }
}
