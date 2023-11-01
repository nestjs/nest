import { Injectable } from '../decorators/core/injectable.decorator';
import { Optional } from '../decorators/core/optional.decorator';
import { HttpStatus } from '../enums/http-status.enum';
import { Type } from '../interfaces';
import {
  ArgumentMetadata,
  PipeTransform,
} from '../interfaces/features/pipe-transform.interface';
import { HttpErrorByCode } from '../utils/http-error-by-code.util';
import { isNil, isUndefined, isString } from '../utils/shared.utils';
import { ValidationPipe, ValidationPipeOptions } from './validation.pipe';

const VALIDATION_ERROR_MESSAGE = 'Validation failed (parsable array expected)';
const DEFAULT_ARRAY_SEPARATOR = ',';

/**
 * @publicApi
 */
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

  constructor(@Optional() protected readonly options: ParseArrayOptions = {}) {
    this.validationPipe = new ValidationPipe({
      transform: true,
      validateCustomDecorators: true,
      ...options,
    });

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
  async transform(value: any, metadata: ArgumentMetadata): Promise<any> {
    if (!value && !this.options.optional) {
      throw this.exceptionFactory(VALIDATION_ERROR_MESSAGE);
    } else if (isNil(value) && this.options.optional) {
      return value;
    }

    if (!Array.isArray(value)) {
      // not sure this is needed lines 72-74
      // if .trim() is called on a non-string, it will throw an error and get caught
      if (!isString(value)) {
        throw this.exceptionFactory(VALIDATION_ERROR_MESSAGE);
      }
      try {
        value = value
          .trim()
          .split(this.options.separator || DEFAULT_ARRAY_SEPARATOR);
      } catch {
        throw this.exceptionFactory(VALIDATION_ERROR_MESSAGE);
      }
    }
    if (this.options.items) {
      if (this.options.stopAtFirstError === false) {
        // strict compare to "false" to make sure
        // that this option is disabled by default
        let errors = [];

        const targetArray = value as Array<unknown>;
        for (let i = 0; i < targetArray.length; i++) {
          try {
            targetArray[i] = await this.toClassInstance(targetArray[i], i);
          } catch (err) {
            let message: string[] | unknown;
            if ((err as any).getResponse) {
              const response = (err as any).getResponse();
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
        value = await Promise.all(value.map(this.toClassInstance));
      }
    }
    return value;
  }

  protected isExpectedTypePrimitive(): boolean {
    return [Boolean, Number, String].includes(this.options.items as any);
  }

  protected toClassInstance(item: any, index: number): any {
    if (this.options.items !== String) {
      try {
        item = JSON.parse(item);
      } catch {}
    }
    if (this.isExpectedTypePrimitive()) {
      return this.validatePrimitive(item, index);
    }

    const validationMetadata: ArgumentMetadata = {
      metatype: this.options.items,
      type: 'query',
    };
    return this.validationPipe.transform(item, validationMetadata);
  }
  protected validatePrimitive(originalValue: any, index?: number) {
    if (this.options.items === Number) {
      const value =
        originalValue !== null && originalValue !== '' ? +originalValue : NaN;
      if (isNaN(value)) {
        throw this.exceptionFactory(
          `${isUndefined(index) ? '' : `[${index}] `}item must be a number`,
        );
      }
      return value;
    } else if (this.options.items === String) {
      if (!isString(originalValue)) {
        return `${originalValue}`;
      }
    } else if (this.options.items === Boolean) {
      if (typeof originalValue !== 'boolean') {
        throw this.exceptionFactory(
          `${
            isUndefined(index) ? '' : `[${index}] `
          }item must be a boolean value`,
        );
      }
    }
    return originalValue;
  }
}
