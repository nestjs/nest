export declare class WsException {
  private readonly error;
  constructor(error: string | object);
  getError(): string | object;
}
