import { Injectable, Optional } from '../decorators/core';
import { ArgumentMetadata, HttpStatus } from '../index';
import { PipeTransform } from '../interfaces/features/pipe-transform.interface';
import {
  ErrorHttpStatusCode,
  HttpErrorByCode,
} from '../utils/http-error-by-code.util';
import { isNil } from '../utils/shared.utils';

/**
 * @publicApi
 */
export interface ParseStringPipeOptions {
  /**
   * If true, the pipe will return null or undefined if the value is not provided
   * @default false
   */
  optional?: boolean;

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

/**
 * Defines the built-in ParseString Pipe
 *
 * @see [Built-in Pipes](https://docs.nestjs.com/pipes#built-in-pipes)
 *
 * @publicApi
 */
@Injectable()
export class ParseStringPipe implements PipeTransform<string> {
  protected exceptionFactory: (error: string) => any;

  constructor(@Optional() protected readonly options?: ParseStringPipeOptions) {
    options = options || {};
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
  async transform(value: string, metadata: ArgumentMetadata): Promise<string> {
    if (isNil(value) && this.options?.optional) {
      return value;
    }

    if (!this.isString(value)) {
      throw this.exceptionFactory('Validation failed (string is expected)');
    }

    const trimmed = value.trim();

    if (trimmed.length === 0) {
      throw this.exceptionFactory(
        'Validation failed (non-empty string is expected)',
      );
    }

    return trimmed;
  }

  protected isString(value: unknown): value is string {
    return typeof value === 'string';
  }
}
