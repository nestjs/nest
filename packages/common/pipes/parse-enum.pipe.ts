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
export interface ParseEnumPipeOptions {
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
    @Optional() protected readonly options?: ParseEnumPipeOptions,
  ) {
    if (!enumType) {
      throw new Error(
        `"ParseEnumPipe" requires "enumType" argument specified (to validate input values).`,
      );
    }
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
  async transform(value: T, metadata: ArgumentMetadata): Promise<T> {
    if (isNil(value) && this.options?.optional) {
      return value;
    }
    if (!this.isEnum(value)) {
      throw this.exceptionFactory(
        'Validation failed (enum string is expected)',
      );
    }
    return value;
  }

  protected isEnum(value: T): boolean {
    const enumValues = Object.keys(this.enumType as object).map(
      item => this.enumType[item],
    );
    return enumValues.includes(value);
  }
}
