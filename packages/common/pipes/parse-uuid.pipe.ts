import { Injectable } from '../decorators/core/injectable.decorator';
import { Optional } from '../decorators/core/optional.decorator';
import { HttpStatus } from '../enums/http-status.enum';
import {
  ArgumentMetadata,
  PipeTransform,
} from '../interfaces/features/pipe-transform.interface';
import {
  ErrorHttpStatusCode,
  HttpErrorByCode,
} from '../utils/http-error-by-code.util';
import { isString } from '../utils/shared.utils';

/**
 * @publicApi
 */
export interface ParseUUIDPipeOptions {
  version?: '3' | '4' | '5';
  errorHttpStatusCode?: ErrorHttpStatusCode;
  exceptionFactory?: (errors: string) => any;
}

/**
 * Defines the built-in ParseUUID Pipe
 *
 * @see [Built-in Pipes](https://docs.nestjs.com/pipes#built-in-pipes)
 *
 * @publicApi
 */
@Injectable()
export class ParseUUIDPipe implements PipeTransform<string> {
  protected static uuidRegExps = {
    3: /^[0-9A-F]{8}-[0-9A-F]{4}-3[0-9A-F]{3}-[0-9A-F]{4}-[0-9A-F]{12}$/i,
    4: /^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i,
    5: /^[0-9A-F]{8}-[0-9A-F]{4}-5[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i,
    all: /^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/i,
  };
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
    if (!this.isUUID(value, this.version)) {
      throw this.exceptionFactory(
        `Validation failed (uuid${
          this.version ? ` v ${this.version}` : ''
        } is expected)`,
      );
    }
    return value;
  }

  protected isUUID(str: unknown, version = 'all') {
    if (!isString(str)) {
      throw this.exceptionFactory('The value passed as UUID is not a string');
    }
    const pattern = ParseUUIDPipe.uuidRegExps[version];
    return pattern?.test(str);
  }
}
