import { Optional } from '../decorators';
import { ArgumentMetadata, BadRequestException, Injectable } from '../index';
import { PipeTransform } from '../interfaces/features/pipe-transform.interface';
import { isUUID } from '../utils/is-uuid';

export interface ParseUUIDPipeOptions {
  version?: '3' | '4' | '5';
  exceptionFactory?: (errors: string) => any;
}

@Injectable()
export class ParseUUIDPipe implements PipeTransform<string> {
  private readonly version: '3' | '4' | '5';
  protected exceptionFactory: (errors: string) => any;

  constructor(@Optional() options?: ParseUUIDPipeOptions) {
    options = options || {};

    this.version = options.version;
    this.exceptionFactory =
      options.exceptionFactory || (error => new BadRequestException(error));
  }
  async transform(value: string, metadata: ArgumentMetadata): Promise<string> {
    if (!isUUID(value, this.version)) {
      throw this.exceptionFactory(
        `Validation failed (uuid v${this.version} is expected)`,
      );
    }
    return value;
  }
}
