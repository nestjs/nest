export class WsException {
  constructor(private readonly error: string|object) {}

  public getError(): string|object { return this.error; }
}
