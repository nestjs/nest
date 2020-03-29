import { Optional } from '../decorators';
import { ArgumentMetadata, HttpStatus, Injectable } from '../index';
import { PipeTransform } from '../interfaces/features/pipe-transform.interface';
import {
  ErrorHttpStatusCode,
  HttpErrorByCode,
} from '../utils/http-error-by-code.util';
import { isUUID } from '../utils/is-uuid';

export interface ParseUUIDPipeOptions {
  version?: '3' | '4' | '5';
  errorHttpStatusCode?: ErrorHttpStatusCode;
  exceptionFactory?: (errors: string) => any;
}

@Injectable()
export class ParseUUIDPipe implements PipeTransform<string> {
  private readonly version: '3' | '4' | '5';
  protected exceptionFactory: (errors: string) => any;

  constructor(@Optional() options?: ParseUUIDPipeOptions) {
    options = options || {};
    const {
      exceptionFactory,
      errorHttpStatusCode = HttpStatus.BAD_REQUEST,
      version,
    } = options;

    this.version = version;
    this.exceptionFactory =
      exceptionFactory ||
      (error => new HttpErrorByCode[errorHttpStatusCode](error));
  }
  async transform(value: string, metadata: ArgumentMetadata): Promise<string> {
    if (!isUUID(value, this.version)) {
      throw this.exceptionFactory(
        `Validation failed (uuid ${
          this.version ? 'v' + this.version : ''
        } is expected)`,
      );
    }
    return value;
  }
}
