export declare class Error {
  public name: string;
  public message: string;
  public stack: string;
  constructor(message?: string);
}

export class RuntimeException extends Error {
  constructor(private readonly msg = ``) {
    super(msg);
  }

  public what() {
    return this.msg;
  }
}
