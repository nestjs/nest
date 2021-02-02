import { ArgumentMetadata, HttpStatus, Injectable, Optional } from '../index';
import { PipeTransform } from '../interfaces/features/pipe-transform.interface';
import {
  ErrorHttpStatusCode,
  HttpErrorByCode,
} from '../utils/http-error-by-code.util';

export interface ParseEnumPipeOptions {
  errorHttpStatusCode?: ErrorHttpStatusCode;
  exceptionFactory?: (error: string) => any;
}

/**
 * Defines the built-in ParseEnum Pipe
 *
 * @see [Built-in Pipes](https://docs.nestjs.com/pipes#built-in-pipes)
 *
 * @publicApi
 */
@Injectable()
export class ParseEnumPipe<T = any> implements PipeTransform<T> {
  protected exceptionFactory: (error: string) => any;

  constructor(
    protected readonly enumType: T,
    @Optional() options?: ParseEnumPipeOptions,
  ) {
    options = options || {};
    const {
      exceptionFactory,
      errorHttpStatusCode = HttpStatus.BAD_REQUEST,
    } = options;

    this.exceptionFactory =
      exceptionFactory ||
      (error => new HttpErrorByCode[errorHttpStatusCode](error));
  }

  /**
   * Method that accesses and performs optional transformation on argument for
   * in-flight requests.
   *
   * @param value currently processed route argument
   * @param metadata contains metadata about the currently processed route argument
   */
  async transform(value: T, metadata: ArgumentMetadata): Promise<T> {
    if (!this.isEnum(value, this.enumType)) {
      throw this.exceptionFactory(
        'Validation failed (enum string is expected)',
      );
    }
    return value;
  }

  protected isEnum(value: T, entity: any): boolean {
    const enumValues = Object.keys(entity).map(k => entity[k]);
    return enumValues.indexOf(value) >= 0;
  }
}
