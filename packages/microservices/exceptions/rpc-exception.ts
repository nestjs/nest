import { isString } from '@nestjs/common/utils/shared.utils';

export class RpcException extends Error {
  public readonly message: any;

  constructor(private readonly error: string | object) {
    super();
    this.message = error;
  }

  public getError(): string | object {
    return this.error;
  }

  public toString(): string {
    const message = this.getErrorString(this.message);
    return `Error: ${message}`;
  }

  private getErrorString(target: string | object): string {
    return isString(target) ? target : JSON.stringify(target);
  }
}
