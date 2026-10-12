/** Express/`http-errors`-compatible error shape so `err.status` drives the response. */
export class HttpError extends Error {
  public status: number;
  public statusCode: number;
  public expose: boolean;
  public type?: string;

  constructor(status: number, message: string, type?: string) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.statusCode = status;
    this.expose = status < 500;
    this.type = type;
  }
}

/** A body-parser style JSON failure: a real `SyntaxError` (so Nest maps it to 400) carrying a status. */
export function parseFailed(
  cause: unknown,
): SyntaxError & { status: number; type: string } {
  const message = cause instanceof Error ? cause.message : String(cause);
  const err = new SyntaxError(message) as SyntaxError & {
    status: number;
    type: string;
  };
  err.status = 400;
  err.type = 'entity.parse.failed';
  return err;
}
