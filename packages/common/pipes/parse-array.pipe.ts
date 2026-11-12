import { Injectable } from '../decorators/core/injectable.decorator';
import { Optional } from '../decorators/core/optional.decorator';
import { HttpStatus } from '../enums/http-status.enum';
import { Type } from '../interfaces';
import {
  ArgumentMetadata,
  PipeTransform,
} from '../interfaces/features/pipe-transform.interface';
import { HttpErrorByCode } from '../utils/http-error-by-code.util';
import { withoutArrayGaps } from '../utils/close-array-gaps.util';
import { isNil, isString, isUndefined } from '../utils/shared.utils';
import {
  OMITTED_ERRORS_MESSAGE,
  resolveMaxErrorMessagesLength,
} from './validation-errors.constants';
import { ValidationPipe, ValidationPipeOptions } from './validation.pipe';

const VALIDATION_ERROR_MESSAGE = 'Validation failed (parsable array expected)';
const DEFAULT_ARRAY_SEPARATOR = ',';

/**
 * @publicApi
 */
export interface ParseArrayPipeOptions extends Omit<
  ValidationPipeOptions,
  'transform' | 'validateCustomDecorators' | 'exceptionFactory'
> {
  /**
   * Type for items to be converted into
   */
  items?: Type<unknown>;
  /**
   * Items separator to split string by
   * @default ','
   */
  separator?: string;
  /**
   * If true, the pipe will return null or undefined if the value is not provided
   * @default false
   */
  optional?: boolean;
  /**
   * Maximum total length, in characters, of the messages in an error response
   * of the built-in exception factory. With `stopAtFirstError: false`, the
   * messages of all the invalid items count together: once they reach it,
   * the next invalid item ends the validation, the items after it are not
   * validated, and a last message says that errors were left out. Set it to
   * `Infinity` to lift the limit.
   *
   * @default 1_000_000
   */
  maxErrorMessagesLength?: number;
  /**
   * A factory function that returns an exception object to be thrown
   * if validation fails.
   * @param error Error message or object
   * @returns The exception object
   */
  exceptionFactory?: (error: any) => any;
}

/** @deprecated Use `ParseArrayPipeOptions` instead. */
export type ParseArrayOptions = ParseArrayPipeOptions;

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

  constructor(
    @Optional() protected readonly options: ParseArrayPipeOptions = {},
  ) {
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
    } else {
      // Only the items that are present (`[, '1']` gives `['1']`), as
      // ValidationPipe does: the gaps of a sparse array would otherwise be
      // handed on unvalidated. The input array is left unchanged.
      value = withoutArrayGaps(value);
    }
    if (this.options.items) {
      const validationMetadata: ArgumentMetadata = {
        metatype: this.options.items,
        type: 'query',
      };

      const isExpectedTypePrimitive = this.isExpectedTypePrimitive();
      const toClassInstance = (item: any, index?: number) => {
        // `JSON.parse` stringifies its argument first, so an array holding a
        // single item (`[1]` becomes `'1'`) would be parsed as that item.
        if (this.options.items !== String && isString(item)) {
          try {
            item = JSON.parse(item);
          } catch {
            // Do nothing
          }
        }
        if (isExpectedTypePrimitive) {
          return this.validatePrimitive(item, index);
        }
        return this.validationPipe.transform(item, validationMetadata);
      };
      if (this.options.stopAtFirstError === false) {
        // strict compare to "false" to make sure
        // that this option is disabled by default
        const errors: string[] = [];
        // The validation pipe applies "maxErrorMessagesLength" to the
        // messages of one item, and a string splits into up to one item per
        // character, so the messages of all the items count against it here.
        // As in the validation pipe, a custom exception factory gets them all.
        let remainingLength = this.options.exceptionFactory
          ? Infinity
          : resolveMaxErrorMessagesLength(this.options.maxErrorMessagesLength);

        const targetArray = value as Array<unknown>;
        for (let i = 0; i < targetArray.length; i++) {
          try {
            targetArray[i] = await toClassInstance(targetArray[i]);
          } catch (err) {
            if (err instanceof Error && !(err as any).getResponse) {
              // Not a validation error, but a failure of the code that
              // validates (e.g. an async constraint or a `@Transform()`
              // function). It is left to the exception filters, as when the
              // pipe stops at the first error: in the list of messages, it
              // would be sent as it is and never logged.
              throw err;
            }
            if (remainingLength <= 0) {
              // The array is rejected either way, so the items that are left
              // are not validated.
              errors.push(OMITTED_ERRORS_MESSAGE);
              break;
            }
            let message: string[] | string;
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
            // Appended in place, since `concat()` would copy all the errors so
            // far for each invalid item, and one at a time, since one item can
            // have more errors than `push(...message)` takes arguments.
            for (const item of Array.isArray(message) ? message : [message]) {
              errors.push(item);
              remainingLength -= isString(item) ? item.length : 1;
            }
          }
        }
        if (errors.length > 0) {
          throw this.exceptionFactory(errors as any);
        }
        return targetArray;
      } else {
        // One item at a time, up to the first that fails: validating them all
        // at once kept the validation and the exception of every item alive
        // together, and a string splits into up to one item per character.
        const targetArray = value as Array<unknown>;
        const items: unknown[] = [];
        for (let i = 0; i < targetArray.length; i++) {
          items.push(await toClassInstance(targetArray[i], i));
        }
        value = items;
      }
    }
    return value;
  }

  protected isExpectedTypePrimitive(): boolean {
    return [Boolean, Number, String].includes(this.options.items as any);
  }

  protected validatePrimitive(originalValue: any, index?: number) {
    if (this.options.items === Number) {
      if (!this.isNumeric(originalValue)) {
        throw this.exceptionFactory(
          `${isUndefined(index) ? '' : `[${index}] `}item must be a number`,
        );
      }
      return Number(originalValue);
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

  protected isNumeric(value: unknown): boolean {
    if (typeof value === 'number') {
      return Number.isFinite(value);
    }
    // Booleans, arrays and blank strings coerce to numbers (`+true === 1`,
    // `+[2] === 2`, `+' ' === 0`), so only strings are converted.
    if (typeof value !== 'string' || value.trim() === '') {
      return false;
    }
    // Reject radix prefixes (`Number('0x10') === 16`), as ParseIntPipe and
    // ParseFloatPipe do.
    if (/^0[box]/i.test(value.trim())) {
      return false;
    }
    return Number.isFinite(Number(value));
  }
}
