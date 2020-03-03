export class RuntimeException extends Error {
  constructor(message = ``) {
    super(message);
  }

  public what() {
    return this.message;
  }
}
