type Response = string | object;

export class HttpException extends Error {
  public readonly message: Response;

  constructor(
    private readonly response: Response,
    private readonly status: number,
  ) {
    this.message = response;
  }

  public getResponse() {
    return this.response;
  }

  public getStatus() {
    return this.status;
  }
}
