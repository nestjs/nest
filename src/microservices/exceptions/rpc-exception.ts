export class RpcException extends Error {
  public readonly message: any;
  constructor(private readonly error: string | object) {
    super();
    this.message = error;
  }

  public getError(): string | object {
    return this.error;
  }
}
