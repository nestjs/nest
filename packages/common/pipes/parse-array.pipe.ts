import { Injectable } from '../decorators/core/injectable.decorator';
import { Optional } from '../decorators/core/optional.decorator';
import { HttpStatus } from '../enums/http-status.enum';
import { Type } from '../interfaces';
import { ArgumentMetadata, PipeTransform } from '../interfaces/features/pipe-transform.interface';
import { HttpErrorByCode } from '../utils/http-error-by-code.util';
import { isNil, isString } from '../utils/shared.utils';

import { ValidationPipe, ValidationPipeOptions } from './validation.pipe';

const VALIDATION_ERROR_MESSAGE = 'Validation failed (parsable array expected)';
const DEFAULT_ARRAY_SEPARATOR = ',';

export interface ParseArrayOptions
  extends Omit<
    ValidationPipeOptions,
    'transform' | 'validateCustomDecorators' | 'exceptionFactory'
  > {
  items?: Type<unknown>;
  separator?: string;
  optional?: boolean;
  exceptionFactory?: (error: any) => any;
}

/**
 * Defines the built-in ParseArray Pipe
 *
 * @see [Built-in Pipes](https://docs.nestjs.com/pipes#built-in-pipes)
 *
 * @publicApi
 */
@Injectable()
export class ParseArrayPipe implements PipeTransform {
  protected readonly validationPipe: ValidationPipe;
  protected exceptionFactory: (error: string) => any;

  constructor(@Optional() private readonly options: ParseArrayOptions = {}) {
    this.validationPipe = new ValidationPipe({
      transform: true,
      validateCustomDecorators: true,
      ...options,
    });

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
  async transform(value: any, metadata: ArgumentMetadata): Promise<any> {
    if (!value && !this.options.optional) {
      throw this.exceptionFactory(VALIDATION_ERROR_MESSAGE);
    } else if (isNil(value) && this.options.optional) {
      return value;
    }

    if (!Array.isArray(value)) {
      if (!isString(value)) {
        throw this.exceptionFactory(VALIDATION_ERROR_MESSAGE);
      } else {
        try {
          value = value
            .trim()
            .split(this.options.separator || DEFAULT_ARRAY_SEPARATOR);
        } catch {
          throw this.exceptionFactory(VALIDATION_ERROR_MESSAGE);
        }
      }
    }
    if (this.options.items) {
      const validationMetadata: ArgumentMetadata = {
        metatype: this.options.items,
        type: 'query',
      };

      const toClassInstance = (item: any) => {
        try {
          item = JSON.parse(item);
        } catch {}
        return this.validationPipe.transform(item, validationMetadata);
      };
      if (this.options.stopAtFirstError === false) {
        // strict compare to "false" to make sure
        // that this option is disabled by default
        let errors = [];

        const targetArray = value as Array<unknown>;
        for (let i = 0; i < targetArray.length; i++) {
          try {
            targetArray[i] = await toClassInstance(targetArray[i]);
          } catch (err) {
            let message: string[] | unknown;
            if (err.getResponse) {
              const response = err.getResponse();
              if (Array.isArray(response.message)) {
                message = response.message.map(
                  (item: string) => `[${i}] ${item}`,
                );
              } else {
                message = `[${i}] ${response.message}`;
              }
            } else {
              message = err;
            }
            errors = errors.concat(message);
          }
        }
        if (errors.length > 0) {
          throw this.exceptionFactory(errors as any);
        }
        return targetArray;
      } else {
        value = await Promise.all(value.map(toClassInstance));
      }
    }
    return value;
  }
}
