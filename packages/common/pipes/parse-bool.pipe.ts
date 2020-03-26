import { ArgumentMetadata, HttpStatus, Injectable, Optional } from '../index';
import { PipeTransform } from '../interfaces/features/pipe-transform.interface';
import {
  ErrorHttpStatusCode,
  HttpErrorByCode,
} from '../utils/http-error-by-code.util';

export interface ParseBoolPipeOptions {
  errorHttpStatusCode?: ErrorHttpStatusCode;
  exceptionFactory?: (error: string) => any;
}

/**
 * Defines the built-in ParseBool Pipe
 *
 * @see [Built-in Pipes](https://docs.nestjs.com/pipes#built-in-pipes)
 *
 * @publicApi
 */
@Injectable()
export class ParseBoolPipe
  implements PipeTransform<string | boolean, Promise<boolean>> {
  protected exceptionFactory: (error: string) => any;

  constructor(@Optional() options?: ParseBoolPipeOptions) {
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
  async transform(
    value: string | boolean,
    metadata: ArgumentMetadata,
  ): Promise<boolean> {
    if (value === true || value === 'true') {
      return true;
    }
    if (value === false || value === 'false') {
      return false;
    }
    throw this.exceptionFactory(
      'Validation failed (boolean string is expected)',
    );
  }
}
