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

export interface ParseIntPipeOptions {
  errorHttpStatusCode?: ErrorHttpStatusCode;
  exceptionFactory?: (error: string) => any;

  /**
   * Minimum value allowed. If not provided, no min check is performed.
   */
  min?: number;

  /**
   * Maximum value allowed. If not provided, no max check is performed.
   */
  max?: number;
}

/**
 * Defines the built-in ParseInt Pipe
 *
 * @see [Built-in Pipes](https://docs.nestjs.com/pipes#built-in-pipes)
 *
 * @publicApi
 */
@Injectable()
export class ParseIntPipe implements PipeTransform<string> {
  protected exceptionFactory: (error: string) => any;
  protected min?: number;
  protected max?: number;

  constructor(@Optional() options?: ParseIntPipeOptions) {
    const {
      exceptionFactory,
      errorHttpStatusCode = HttpStatus.BAD_REQUEST,
      min,
      max,
    } = options || {};

    this.exceptionFactory =
      exceptionFactory ||
      (error => new HttpErrorByCode[errorHttpStatusCode](error));
    this.min = min;
    this.max = max;
  }

  /**
   * Method that accesses and performs optional transformation on argument for
   * in-flight requests.
   *
   * @param value currently processed route argument
   * @param metadata contains metadata about the currently processed route argument
   */
  async transform(value: string, metadata: ArgumentMetadata): Promise<number> {
    const isNumeric =
      ['string', 'number'].includes(typeof value) &&
      /^-?\d+$/.test(value) &&
      isFinite(value as any);
    if (!isNumeric) {
      throw this.exceptionFactory(
        'Validation failed (numeric string is expected)',
      );
    }

    const int = parseInt(value, 10);

    if (this.min != null && int < this.min) {
      throw this.exceptionFactory(
        `Validation failed (min value is ${this.min})`,
      );
    }

    if (this.max != null && int > this.max) {
      throw this.exceptionFactory(
        `Validation failed (max value is ${this.max})`,
      );
    }

    return int;
  }
}
