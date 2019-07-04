export class RpcException extends Error {
  public readonly message: any;
  constructor(private readonly error: string | object) {
    super();
    this.message = error;
  }

  public getError(): string | object {
    return this.error;
  }

  private getErrorString(target) {
    if(typeof target === 'string') {
      return target;
    }

    return JSON.stringify(target);
  }

  public toString(): string {
    const message = this.getErrorString(this.message);

    return `Error: ${message}`;
  }
}
