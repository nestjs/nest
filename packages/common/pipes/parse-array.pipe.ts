import { Injectable } from '../decorators/core/injectable.decorator';
import { Optional } from '../decorators/core/optional.decorator';
import { HttpStatus } from '../enums/http-status.enum';
import { HttpException } from '../exceptions';
import { Type } from '../interfaces';
import {
  ArgumentMetadata,
  PipeTransform,
} from '../interfaces/features/pipe-transform.interface';
import { HttpErrorByCode } from '../utils/http-error-by-code.util';
import { isBoolean, isNil, isString, isUndefined } from '../utils/shared.utils';
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

    if (isString(value)) {
      value = this.splitString(value);
    }

    if (!Array.isArray(value)) {
      throw this.exceptionFactory(VALIDATION_ERROR_MESSAGE);
    }

    if (this.options.items) {
      return await this.getValidateResponse(value);
    }

    return value;
  }

  private async getValidateResponse(values: unknown[]) {
    const toClassInstance = (item, index?: number) => {
      const validationMetadata: ArgumentMetadata = {
        metatype: this.options.items,
        type: 'query',
      };

      try {
        item = JSON.parse(item);
      } catch {}
      if (this.isExpectedTypePrimitive()) {
        return this.validatePrimitive(item, index);
      }
      return this.validationPipe.transform(item, validationMetadata);
    };

    if (this.options.stopAtFirstError === false) {
      return await this.getResponse(values, toClassInstance);
    }

    return await Promise.all(values.map(toClassInstance));
  }

  private async getResponse(values: unknown[], toClassInstance: Function) {
    let errors = [];

    const targetArray = values;

    for (let i = 0; i < targetArray.length; i++) {
      const result = await this.getValidateTarget(
        { target: targetArray[i], indexTarget: i },
        toClassInstance,
      );
      if (!result.result) {
        errors = errors.concat(result.error);
      }
      targetArray[i] = result.result;
    }
    if (errors.length > 0) {
      throw this.exceptionFactory(errors as any);
    }

    return targetArray;
  }

  private async getValidateTarget(
    info: { target: unknown; indexTarget: number },
    toClassInstance: Function,
  ): Promise<{
    error: any;
    result: any;
  }> {
    try {
      const result = toClassInstance(info.target);
      return {
        error: null,
        result: result,
      };
    } catch (err) {
      let message: string[] | unknown;
      if (err instanceof HttpException) {
        const response = err.getResponse() as any;
        message = Array.isArray(response.message)
          ? response.message.map(
              (item: string) => `[${info.indexTarget}] ${item}`,
            )
          : `[${info.indexTarget}] ${response.message}`;
      } else {
        message = err;
      }
      return {
        result: null,
        error: message,
      };
    }
  }

  private splitString(value: string): string[] {
    try {
      return value
        .trim()
        .split(this.options.separator || DEFAULT_ARRAY_SEPARATOR);
    } catch {
      throw this.exceptionFactory(VALIDATION_ERROR_MESSAGE);
    }
  }

  protected isExpectedTypePrimitive(): boolean {
    return [Boolean, Number, String].includes(this.options.items as any);
  }

  protected validatePrimitive(originalValue: any, index?: number) {
    if (
      this.options.items === Number &&
      isNaN(
        originalValue !== null && originalValue !== '' ? +originalValue : NaN,
      )
    ) {
      throw this.exceptionFactory(
        `${isUndefined(index) ? '' : `[${index}] `}item must be a number`,
      );
    } else if (this.options.items === String && !isString(originalValue)) {
      return `${originalValue}`;
    } else if (this.options.items === Boolean && !isBoolean(originalValue)) {
      throw this.exceptionFactory(
        `${
          isUndefined(index) ? '' : `[${index}] `
        }item must be a boolean value`,
      );
    }
    return originalValue;
  }
}
