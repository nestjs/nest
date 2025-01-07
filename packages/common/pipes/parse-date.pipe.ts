import { Injectable } from '../decorators/core/injectable.decorator';
import { HttpStatus } from '../enums/http-status.enum';
import { PipeTransform } from '../interfaces/features/pipe-transform.interface';
import {
  ErrorHttpStatusCode,
  HttpErrorByCode,
} from '../utils/http-error-by-code.util';
import { isNil } from '../utils/shared.utils';

export interface ParseDatePipeOptions {
  /**
   * If true, the pipe will return null or undefined if the value is not provided
   * @default false
   */
  optional?: boolean;
  /**
   * Default value for the date
   */
  default?: () => Date;
  /**
   * The HTTP status code to be used in the response when the validation fails.
   */
  errorHttpStatusCode?: ErrorHttpStatusCode;
  /**
   * A factory function that returns an exception object to be thrown
   * if validation fails.
   * @param error Error message
   * @returns The exception object
   */
  exceptionFactory?: (error: string) => any;
}

@Injectable()
export class ParseDatePipe
  implements PipeTransform<string | number | undefined | null>
{
  protected exceptionFactory: (error: string) => any;

  constructor(private readonly options: ParseDatePipeOptions = {}) {
    const { exceptionFactory, errorHttpStatusCode = HttpStatus.BAD_REQUEST } =
      options;

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
  transform(
    value: string | number | undefined | null,
  ): Date | null | undefined {
    if (this.options.optional && isNil(value)) {
      return this.options.default ? this.options.default() : value;
    }

    if (!value) {
      throw this.exceptionFactory('Validation failed (no Date provided)');
    }

    const transformedValue = new Date(value);

    if (isNaN(transformedValue.getTime())) {
      throw this.exceptionFactory('Validation failed (invalid date format)');
    }

    return transformedValue;
  }
}
