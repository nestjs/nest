import type { StandardSchemaV1 } from '@standard-schema/spec';
import { types } from 'util';
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

/**
 * Built-in JavaScript types that should be excluded from prototype stripping
 * to avoid conflicts with test frameworks like Jest's useFakeTimers
 */
const BUILT_IN_TYPES = [Date, RegExp, Error, Map, Set, WeakMap, WeakSet];

/**
 * @publicApi
 */
export interface StandardSchemaValidationPipeOptions {
  /**
   * If true, the pipe will return the value produced by the schema
   * (which may differ from the input if the schema coerces/transforms values).
   * If false, the original input value is returned after successful validation.
   * @default true
   */
  transform?: boolean;
  /**
   * If true, the pipe will also validate parameters decorated with custom decorators
   * (created with `createParamDecorator`). When false, custom parameters are skipped.
   * @default false
   */
  validateCustomDecorators?: boolean;
  /**
   * Options to pass to the standard schema `validate` function.
   * These options are forwarded as the second argument to the schema's `~standard.validate` method.
   */
  validateOptions?: Record<string, unknown>;
  /**
   * The HTTP status code to be used in the response when the validation fails.
   * @default HttpStatus.BAD_REQUEST
   */
  errorHttpStatusCode?: ErrorHttpStatusCode;
  /**
   * A factory function that returns an exception object to be thrown
   * if validation fails.
   * @param issues The issues returned by the standard schema validation
   * @returns The exception object
   */
  exceptionFactory?: (issues: readonly StandardSchemaV1.Issue[]) => any;
}

/**
 * Defines the built-in StandardSchemaValidation Pipe.
 *
 * Uses a standard schema object (conforming to the Standard Schema spec)
 * attached to the parameter metadata to validate incoming values.
 *
 * @see [Standard Schema](https://github.com/standard-schema/standard-schema)
 *
 * @publicApi
 */
@Injectable()
export class StandardSchemaValidationPipe implements PipeTransform {
  protected isTransformEnabled: boolean;
  protected validateCustomDecorators: boolean;
  protected validateOptions: Record<string, unknown> | undefined;
  protected exceptionFactory: (
    issues: readonly StandardSchemaV1.Issue[],
  ) => any;

  constructor(
    @Optional()
    protected readonly options?: StandardSchemaValidationPipeOptions,
  ) {
    const {
      transform = true,
      validateCustomDecorators = false,
      validateOptions,
      exceptionFactory,
      errorHttpStatusCode = HttpStatus.BAD_REQUEST,
    } = options || {};

    this.isTransformEnabled = transform;
    this.validateCustomDecorators = validateCustomDecorators;
    this.validateOptions = validateOptions;

    this.exceptionFactory =
      exceptionFactory ||
      (issues => {
        const messages = issues.map(issue => issue.message);
        return new HttpErrorByCode[errorHttpStatusCode](messages);
      });
  }

  /**
   * Method that validates the incoming value against the standard schema
   * provided in the parameter metadata.
   *
   * @param value currently processed route argument
   * @param metadata contains metadata about the currently processed route argument
   */
  async transform<T = any>(value: T, metadata: ArgumentMetadata): Promise<T> {
    const schema = metadata.schema;
    if (!schema || !this.toValidate(metadata)) {
      return value;
    }

    this.stripProtoKeys(value);

    const result = await this.validate<T>(value, schema, this.validateOptions);

    if (result.issues) {
      throw this.exceptionFactory(result.issues);
    }
    return this.isTransformEnabled ? result.value : value;
  }

  /**
   * Determines whether validation should be performed for the given metadata.
   * Skips validation for custom decorators unless `validateCustomDecorators` is enabled.
   *
   * @param metadata contains metadata about the currently processed route argument
   * @returns `true` if validation should be performed
   */
  protected toValidate(metadata: ArgumentMetadata): boolean {
    const { type } = metadata;
    if (type === 'custom' && !this.validateCustomDecorators) {
      return false;
    }
    return true;
  }

  /**
   * Validates a value against a standard schema.
   * Can be overridden to customize validation behavior.
   *
   * @param value The value to validate
   * @param schema The standard schema to validate against
   * @param options Optional options forwarded to the schema's validate method
   * @returns The validation result
   */
  protected validate<T = unknown>(
    value: unknown,
    schema: StandardSchemaV1,
    options?: Record<string, unknown>,
  ): Promise<StandardSchemaV1.Result<T>> | StandardSchemaV1.Result<T> {
    return schema['~standard'].validate(value, options) as
      | Promise<StandardSchemaV1.Result<T>>
      | StandardSchemaV1.Result<T>;
  }

  /**
   * Strips dangerous prototype pollution keys from an object.
   */
  protected stripProtoKeys(value: any) {
    if (
      value == null ||
      typeof value !== 'object' ||
      types.isTypedArray(value)
    ) {
      return;
    }

    if (BUILT_IN_TYPES.some(type => value instanceof type)) {
      return;
    }

    if (Array.isArray(value)) {
      for (const v of value) {
        this.stripProtoKeys(v);
      }
      return;
    }

    delete value.__proto__;
    delete value.prototype;

    const constructorType = value?.constructor;
    if (constructorType && !BUILT_IN_TYPES.includes(constructorType)) {
      delete value.constructor;
    }

    for (const key in value) {
      this.stripProtoKeys(value[key]);
    }
  }
}
