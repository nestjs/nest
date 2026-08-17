import { Injectable } from '../decorators/core/injectable.decorator.js';
import { Optional } from '../decorators/core/optional.decorator.js';
import { HttpStatus } from '../enums/http-status.enum.js';
import {
  ArgumentMetadata,
  PipeTransform,
} from '../interfaces/features/pipe-transform.interface.js';
import {
  ErrorHttpStatusCode,
  HttpErrorByCode,
} from '../utils/http-error-by-code.util.js';
import { isNil } from '../utils/shared.utils.js';

/**
 * @publicApi
 */
export interface ParseBoolPipeOptions {
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
  /**
   * If true, the pipe will return null or undefined if the value is not provided
   * @default false
   */
  optional?: boolean;
}

/**
 * Defines the built-in ParseBool Pipe
 *
 * @see [Built-in Pipes](https://docs.nestjs.com/pipes#built-in-pipes)
 *
 * @publicApi
 */
@Injectable()
export class ParseBoolPipe implements PipeTransform {
  protected exceptionFactory: (error: string) => any;

  constructor(@Optional() protected readonly options?: ParseBoolPipeOptions) {
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
  async transform(
    value: unknown,
    metadata: ArgumentMetadata,
  ): Promise<boolean | undefined | null> {
    if (isNil(value) && this.options?.optional) {
      return value;
    }
    if (this.isTrue(value)) {
      return true;
    }
    if (this.isFalse(value)) {
      return false;
    }
    throw this.exceptionFactory(
      'Validation failed (boolean string is expected)',
    );
  }

  /**
   * @param value currently processed route argument
   * @returns `true` if `value` is said 'true', ie., if it is equal to the boolean
   * `true` or the string `"true"`
   */
  protected isTrue(value: unknown): boolean {
    return value === true || value === 'true';
  }

  /**
   * @param value currently processed route argument
   * @returns `true` if `value` is said 'false', ie., if it is equal to the boolean
   * `false` or the string `"false"`
   */
  protected isFalse(value: unknown): boolean {
    return value === false || value === 'false';
  }
}
