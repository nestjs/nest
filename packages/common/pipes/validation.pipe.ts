import { iterate } from 'iterare';
import { Injectable } from '../decorators/core/index.js';
import { Optional } from '../decorators/index.js';
import { HttpStatus } from '../enums/http-status.enum.js';
import type { HttpException } from '../exceptions/http.exception.js';
import { ClassTransformOptions } from '../interfaces/external/class-transform-options.interface.js';
import { TransformerPackage } from '../interfaces/external/transformer-package.interface.js';
import { ValidationError } from '../interfaces/external/validation-error.interface.js';
import { ValidatorOptions } from '../interfaces/external/validator-options.interface.js';
import { ValidatorPackage } from '../interfaces/external/validator-package.interface.js';
import {
  ArgumentMetadata,
  PipeTransform,
} from '../interfaces/features/pipe-transform.interface.js';
import { Type } from '../interfaces/type.interface.js';
import {
  ErrorHttpStatusCode,
  HttpErrorByCode,
} from '../utils/http-error-by-code.util.js';
import { closeArrayGaps } from '../utils/close-array-gaps.util.js';
import { loadPackage } from '../utils/load-package.util.js';
import {
  isFunction,
  isNil,
  isObject,
  isString,
  isUndefined,
} from '../utils/shared.utils.js';
import { stripProtoKeys } from '../utils/strip-proto-keys.util.js';
import {
  OMITTED_ERRORS_MESSAGE,
  resolveMaxErrorMessagesLength,
} from './validation-errors.constants.js';

/**
 * @publicApi
 */
export type ValidationErrorFormat = 'list' | 'grouped';

/**
 * @publicApi
 */
export interface ValidationPipeOptions extends ValidatorOptions {
  transform?: boolean;
  disableErrorMessages?: boolean;
  transformOptions?: ClassTransformOptions;
  errorHttpStatusCode?: ErrorHttpStatusCode;
  exceptionFactory?: (errors: ValidationError[]) => any;
  validateCustomDecorators?: boolean;
  expectedType?: Type<any>;
  validatorPackage?: ValidatorPackage;
  transformerPackage?: TransformerPackage;
  /**
   * Specifies the format of validation error messages.
   * - 'list': Returns an array of error message strings (default). The response message is `string[]`.
   * - 'grouped': Returns an object with property paths as keys and arrays of unmodified error messages as values.
   *   The response message is `Record<string, string[]>`. Custom messages defined in validation decorators
   *   (e.g., `@IsNotEmpty({ message: 'Name is required' })`) are preserved without parent path prefixes.
   *
   * @remarks
   * When using 'grouped', the `message` property in the error response changes from `string[]` to `Record<string, string[]>`.
   * If you have exception filters or interceptors that assume `message` is always an array, they will need to be updated.
   */
  errorFormat?: ValidationErrorFormat;
  /**
   * Maximum total length, in characters, of the messages in an error response
   * of the built-in exception factory, counting the property path that comes
   * with each message. The errors past it are left out, and a last message
   * (in the 'grouped' format, a '...' entry) says so. Set it to `Infinity` to
   * lift the limit.
   *
   * @default 1_000_000
   */
  maxErrorMessagesLength?: number;
}

// Metadata types of class-validator ("ValidationTypes")
const NESTED_VALIDATION = 'nestedValidation';
const CONDITIONAL_VALIDATION = 'conditionalValidation';

let classValidator: any = {} as any;
let classTransformer: any = {} as any;
// The packages of the pipe created last, which may still be loading.
// "transform()" resolves them into the variables above, so that a pipe
// created while a value is validated (e.g. a request-scoped one) doesn't put
// promises in place of the packages that validation uses.
let pendingClassValidator: any;
let pendingClassTransformer: any;

/**
 * @see [Validation](https://docs.nestjs.com/techniques/validation)
 *
 * @publicApi
 */
@Injectable()
export class ValidationPipe implements PipeTransform {
  protected isTransformEnabled: boolean;
  protected isDetailedOutputDisabled?: boolean;
  protected validatorOptions: ValidatorOptions;
  protected transformOptions: ClassTransformOptions | undefined;
  protected errorHttpStatusCode: ErrorHttpStatusCode;
  protected expectedType: Type<any> | undefined;
  protected exceptionFactory: (errors: ValidationError[]) => any;
  protected validateCustomDecorators: boolean;
  protected errorFormat: ValidationErrorFormat;
  protected maxErrorMessagesLength: number;

  constructor(@Optional() options?: ValidationPipeOptions) {
    options = options || {};
    const {
      transform,
      disableErrorMessages,
      errorHttpStatusCode,
      expectedType,
      transformOptions,
      exceptionFactory,
      validatorPackage,
      transformerPackage,
      validateCustomDecorators,
      errorFormat,
      maxErrorMessagesLength,
      ...validatorOptions
    } = options;

    // @see [https://github.com/nestjs/nest/issues/10683#issuecomment-1413690508](https://github.com/nestjs/nest/issues/10683#issuecomment-1413690508)
    this.validatorOptions = { forbidUnknownValues: false, ...validatorOptions };

    this.isTransformEnabled = !!transform;
    this.transformOptions = transformOptions;
    this.isDetailedOutputDisabled = disableErrorMessages;
    this.validateCustomDecorators = validateCustomDecorators || false;
    this.errorHttpStatusCode = errorHttpStatusCode || HttpStatus.BAD_REQUEST;
    this.expectedType = expectedType;
    this.errorFormat = errorFormat || 'list';
    this.maxErrorMessagesLength = resolveMaxErrorMessagesLength(
      maxErrorMessagesLength,
    );
    this.exceptionFactory = exceptionFactory || this.createExceptionFactory();

    pendingClassValidator = this.loadValidator(validatorPackage);
    pendingClassTransformer = this.loadTransformer(transformerPackage);
    if (!(pendingClassValidator instanceof Promise)) {
      classValidator = pendingClassValidator;
    }
    if (!(pendingClassTransformer instanceof Promise)) {
      classTransformer = pendingClassTransformer;
    }
  }

  protected loadValidator(
    validatorPackage?: ValidatorPackage,
  ): ValidatorPackage | Promise<ValidatorPackage> {
    return (
      validatorPackage ??
      loadPackage(
        'class-validator',
        'ValidationPipe',
        () => import('class-validator'),
      )
    );
  }

  protected loadTransformer(
    transformerPackage?: TransformerPackage,
  ): TransformerPackage | Promise<TransformerPackage> {
    return (
      transformerPackage ??
      loadPackage(
        'class-transformer',
        'ValidationPipe',
        () => import('class-transformer'),
      )
    );
  }

  public async transform(value: unknown, metadata: ArgumentMetadata) {
    if (this.expectedType) {
      metadata = { ...metadata, metatype: this.expectedType };
    }

    const metatype = metadata.metatype;
    if (!metatype || !this.toValidate(metadata)) {
      // Untyped inputs skip the class-validation path below, so strip here too
      if (
        metadata.type !== 'custom' &&
        value !== null &&
        typeof value === 'object'
      ) {
        this.stripProtoKeys(value);
      }
      return this.isTransformEnabled
        ? this.transformPrimitive(value, metadata)
        : value;
    }

    classValidator = (await pendingClassValidator) as ValidatorPackage;
    classTransformer = (await pendingClassTransformer) as TransformerPackage;

    const originalValue = value;
    value = this.toEmptyIfNil(value, metatype);
    // class-transformer copies an array without its gaps, so the array of a
    // sparse value would be validated without them and returned with them
    // when the value is returned as it came. The gaps are closed first, in
    // place, as the prototype keys are stripped below.
    this.closeArrayGaps(value);

    const isNil = value !== originalValue;
    const isPrimitive = this.isPrimitive(value);
    // class-transformer copies a binary value as it is, and class-validator
    // would then look for the properties of the class among its bytes (and,
    // with "whitelist", fail to delete them), so it gets a stand-in too.
    const isStandIn = isPrimitive || this.isBinary(value);
    this.stripProtoKeys(value);
    let entity = classTransformer.plainToInstance(
      metatype,
      value,
      this.transformOptions,
    );

    const originalEntity = entity;
    const isCtorNotEqual = entity.constructor !== metatype;

    if (isCtorNotEqual && !isStandIn) {
      entity.constructor = metatype;
    } else if (isCtorNotEqual) {
      // when "entity" is a primitive or a binary value, we have to
      // temporarily replace the entity to perform the validation against the
      // original metatype defined inside the handler
      entity = { constructor: metatype };
    }

    const binaryErrors = this.findNestedBinaryValues(entity);
    if (binaryErrors.length > 0) {
      // A binary value (e.g. an attachment of a socket.io message) is never
      // an instance of a nested class: class-transformer copies it instead
      // of building the class from it, and class-validator then looks for
      // the rules of its own type (there are none), not those of the class.
      throw await this.exceptionFactory(binaryErrors);
    }
    const errors = await this.validate(entity, {
      ...this.validatorOptions,
      // The target of an error is the whole object it was found in, so an
      // exception factory that sends the errors would repeat that object
      // once per error.
      validationError: {
        target: false,
        ...this.validatorOptions.validationError,
      },
    });
    if (isCtorNotEqual && !isStandIn) {
      // Left on the value, the stand-in would go wherever the value is
      // copied (e.g. `{ ...dto }`), and class-transformer would then take
      // the copy for an instance of the class.
      delete entity.constructor;
    }
    if (errors.length > 0) {
      if (isUndefined(this.validatorOptions.validationError?.value)) {
        this.stripParentErrorValues(errors);
      }
      throw await this.exceptionFactory(errors);
    }
    if (
      isCtorNotEqual &&
      (isStandIn || Array.isArray(value)) &&
      (await this.hasValidationRules(metatype))
    ) {
      // An array, a primitive or a binary value is never an instance of the
      // class: the validation above has only seen a stand-in without any
      // property set, which passes when none of them is required.
      throw await this.exceptionFactory([
        {
          property: metadata.data || metadata.type,
          constraints: { isObject: 'Validation failed (object is expected)' },
          children: [],
        },
      ]);
    }

    if (originalValue === undefined && originalEntity === '') {
      // Since SWC requires empty string for validation (to avoid an error),
      // a fallback is needed to revert to the original value (when undefined).
      // @see [https://github.com/nestjs/nest/issues/14430](https://github.com/nestjs/nest/issues/14430)
      return originalValue;
    }
    if (isStandIn) {
      // if the value is a primitive (or binary) value and the validation process has been successfully completed
      // we have to revert the original value passed through the pipe
      entity = originalEntity;
    }
    if (this.isTransformEnabled) {
      return entity;
    }
    if (isNil) {
      // if the value was originally undefined or null, revert it back
      return originalValue;
    }

    // we check if the number of keys of the "validatorOptions" is higher than 1 (instead of 0)
    // because the "forbidUnknownValues" now fallbacks to "false" (in case it wasn't explicitly specified)
    const shouldTransformToPlain =
      Object.keys(this.validatorOptions).length > 1;
    return shouldTransformToPlain
      ? classTransformer.classToPlain(entity, this.transformOptions)
      : value;
  }

  public createExceptionFactory() {
    return (validationErrors: ValidationError[] = []) => {
      if (this.isDetailedOutputDisabled) {
        return new HttpErrorByCode[this.errorHttpStatusCode]();
      }
      const budget = {
        remaining: this.maxErrorMessagesLength,
        isExceeded: false,
      };
      validationErrors = this.limitValidationErrors(validationErrors, budget);
      if (this.errorFormat === 'grouped') {
        let errors = this.groupValidationErrors(validationErrors);
        if (budget.isExceeded) {
          errors = { ...errors, '...': [OMITTED_ERRORS_MESSAGE] };
        }
        // Custom (object) bodies are returned verbatim by
        // `HttpException.createBody`, so add the standard envelope fields
        // explicitly to match the shape of the "list" format.
        const { message: error, statusCode } = (
          new HttpErrorByCode[this.errorHttpStatusCode]() as HttpException
        ).getResponse() as { message: string; statusCode: number };
        return new HttpErrorByCode[this.errorHttpStatusCode]({
          message: errors,
          error,
          statusCode,
        });
      }
      let errors = this.flattenValidationErrors(validationErrors);
      if (budget.isExceeded) {
        errors = [...errors, OMITTED_ERRORS_MESSAGE];
      }
      return new HttpErrorByCode[this.errorHttpStatusCode](errors);
    };
  }

  /**
   * Leaves out the errors that come after the first "maxErrorMessagesLength"
   * characters of messages. Each message counts with the path of its
   * property, which is what makes the response to a deeply nested payload
   * grow faster than the payload. The errors past the limit are not visited.
   */
  protected limitValidationErrors(
    validationErrors: ValidationError[],
    budget: { remaining: number; isExceeded: boolean },
    parentPathLength = 0,
  ): ValidationError[] {
    const limited: ValidationError[] = [];
    let isChanged = false;
    for (const error of validationErrors) {
      if (budget.remaining <= 0) {
        budget.isExceeded = true;
        return limited;
      }
      const pathLength = parentPathLength + String(error.property).length + 1;
      for (const key in error.constraints) {
        budget.remaining -= pathLength + String(error.constraints[key]).length;
      }
      const children =
        error.children &&
        this.limitValidationErrors(error.children, budget, pathLength);
      if (children === error.children) {
        limited.push(error);
      } else {
        limited.push({ ...error, children });
        isChanged = true;
      }
    }
    return isChanged ? limited : validationErrors;
  }

  /**
   * Removes the value of the errors that have children. That value is the
   * object or array in which the children were found, so an exception
   * factory that sends the errors would write a nested value once for each
   * level above it. The values left are those of separate parts of the
   * validated value.
   */
  protected stripParentErrorValues(validationErrors: ValidationError[]): void {
    // Not recursive, since the validated value decides how deep errors go.
    const pending = [validationErrors];
    while (pending.length > 0) {
      for (const error of pending.pop()!) {
        if (error.children && error.children.length > 0) {
          delete error.value;
          pending.push(error.children);
        }
      }
    }
  }

  protected toValidate(metadata: ArgumentMetadata): boolean {
    const { metatype, type } = metadata;
    if (type === 'custom' && !this.validateCustomDecorators) {
      return false;
    }
    const types = [String, Boolean, Number, Array, Object, Buffer, Date];
    return !types.some(t => metatype === t) && !isNil(metatype);
  }

  protected transformPrimitive(value: unknown, metadata: ArgumentMetadata) {
    if (!metadata.data) {
      // leave top-level query/param objects unmodified
      return value;
    }
    const { type, metatype } = metadata;
    if (type !== 'param' && type !== 'query') {
      return value;
    }
    if (metatype === Boolean) {
      if (isUndefined(value)) {
        // This is an workaround to deal with optional boolean values since
        // optional booleans shouldn't be parsed to a valid boolean when
        // they were not defined
        return undefined;
      }
      // Any fasly value but `undefined` will be parsed to `false`
      return value === true || value === 'true';
    }
    if (metatype === Number) {
      if (isUndefined(value)) {
        // This is a workaround to deal with optional numeric values since
        // optional numerics shouldn't be parsed to a valid number when
        // they were not defined
        return undefined;
      }
      return +(value as any);
    }
    if (metatype === String && !isUndefined(value)) {
      return String(value);
    }
    return value;
  }

  protected toEmptyIfNil<T = any, R = T>(
    value: unknown,
    metatype: Type<unknown> | object,
  ): R | object | string {
    if (!isNil(value)) {
      return value as any as R;
    }
    if (
      typeof metatype === 'function' ||
      (metatype && 'prototype' in metatype && metatype.prototype?.constructor)
    ) {
      return {} as object;
    }
    // SWC requires empty string to be returned instead of an empty object
    // when the value is nil and the metatype is not a class instance, but a plain object (enum, for example).
    // Otherwise, the error will be thrown.
    // @see [https://github.com/nestjs/nest/issues/12680](https://github.com/nestjs/nest/issues/12680)
    return '';
  }

  /**
   * Closes the gaps of the sparse arrays in the value to validate, in place
   * (`[, 'a']` becomes `['a']`), so that the arrays that are validated are
   * the ones that are returned.
   */
  protected closeArrayGaps(value: unknown): void {
    closeArrayGaps(value);
  }

  protected isPrimitive(value: unknown): boolean {
    return ['number', 'boolean', 'string'].includes(typeof value);
  }

  protected isBinary(value: unknown): boolean {
    return ArrayBuffer.isView(value) || value instanceof ArrayBuffer;
  }

  protected stripProtoKeys(value: any): void {
    stripProtoKeys(value);
  }

  protected validate(
    object: object,
    validatorOptions?: ValidatorOptions,
  ): Promise<ValidationError[]> | ValidationError[] {
    return classValidator.validate(object, validatorOptions);
  }

  /**
   * Returns an error for each binary value (a Buffer, a typed array or an
   * ArrayBuffer) that a property validated as a nested object holds, directly
   * or as an item, in the shape of class-validator's error for a primitive in
   * that place. The properties are read from class-validator's metadata
   * storage, once per class: a validator package without one is not checked.
   */
  protected findNestedBinaryValues(
    object: any,
    metadataCache = new Map<unknown, any[]>(),
  ): ValidationError[] {
    const metadataStorage = classValidator.getMetadataStorage?.();
    if (
      !metadataStorage ||
      !isObject(object) ||
      Array.isArray(object) ||
      this.isBinary(object) ||
      !isFunction((object as any).constructor) ||
      // an object that holds nothing but primitives needs no look
      !Object.values(object).some(isObject)
    ) {
      return [];
    }
    const target = object as Record<string, unknown>;
    let metadatas = metadataCache.get(target.constructor);
    if (!metadatas) {
      const {
        always = false,
        strictGroups = false,
        groups,
      } = this.validatorOptions;
      metadatas = metadataStorage.getTargetValidationMetadatas(
        target.constructor,
        undefined,
        always,
        strictGroups,
        groups,
      ) as any[];
      metadataCache.set(target.constructor, metadatas);
    }
    const errors: ValidationError[] = [];
    const checked = new Set<string>();
    for (const metadata of metadatas) {
      const property: string = metadata.propertyName;
      if (metadata.type !== NESTED_VALIDATION || checked.has(property)) {
        continue;
      }
      checked.add(property);
      const value = target[property];
      // class-validator does not look at a value that a condition of the
      // property (e.g. "@ValidateIf()" or "@IsOptional()") rules out
      const isValidated = () =>
        metadatas.every(
          item =>
            item.type !== CONDITIONAL_VALIDATION ||
            item.propertyName !== property ||
            item.constraints[0](target, value),
        );
      const message = (
        isString(metadata.message)
          ? metadata.message
          : `${metadata.each ? 'each value in ' : ''}nested property $property must be either object or array`
      ).replace(/\$property/g, property);
      const error = this.toNestedBinaryError(
        property,
        value,
        message,
        metadataCache,
      );
      if (error && isValidated()) {
        errors.push(error);
      }
    }
    return errors;
  }

  protected toNestedBinaryError(
    property: string,
    value: unknown,
    message: string,
    metadataCache: Map<unknown, any[]>,
  ): ValidationError | undefined {
    if (this.isBinary(value)) {
      return {
        property,
        constraints: { [NESTED_VALIDATION]: message },
        children: [],
      };
    }
    let children: ValidationError[] = [];
    if (Array.isArray(value) || value instanceof Set || value instanceof Map) {
      // class-validator validates each item, with or without "each"
      const items: any = value instanceof Set ? Array.from(value) : value;
      items.forEach((item: unknown, key: unknown) => {
        const error = this.toNestedBinaryError(
          String(key),
          item,
          message,
          metadataCache,
        );
        if (error) {
          children.push(error);
        }
      });
    } else {
      children = this.findNestedBinaryValues(value, metadataCache);
    }
    return children.length > 0 ? { property, children } : undefined;
  }

  protected async hasValidationRules(
    metatype: Type<unknown>,
  ): Promise<boolean> {
    // "forbidUnknownValues" rejects a class without any rule that applies
    const errors = await this.validate(
      { constructor: metatype },
      { ...this.validatorOptions, forbidUnknownValues: true },
    );
    return !errors.some(error => error.constraints?.unknownValue);
  }

  protected flattenValidationErrors(
    validationErrors: ValidationError[],
  ): string[] {
    return iterate(validationErrors)
      .map(error => this.mapChildrenToValidationErrors(error))
      .flatten()
      .filter(item => !!item.constraints)
      .map(item => Object.values(item.constraints!))
      .flatten()
      .toArray();
  }

  protected groupValidationErrors(
    validationErrors: ValidationError[],
    parentPath?: string,
    result: Record<string, string[]> = {},
  ): Record<string, string[]> {
    for (const error of validationErrors) {
      const path = parentPath
        ? `${parentPath}.${error.property}`
        : error.property;
      if (error.constraints) {
        result[path] = Object.values(error.constraints);
      }
      if (error.children && error.children.length) {
        // Nested errors go into the same result: copying each level's result
        // into its parent took as many insertions as depth times leaves.
        const nested = this.groupValidationErrors(error.children, path, result);
        if (nested !== result) {
          // an override returned a result of its own
          Object.assign(result, nested);
        }
      }
    }
    return result;
  }

  protected mapChildrenToValidationErrors(
    error: ValidationError,
    parentPath?: string,
    validationErrors: ValidationError[] = [],
  ): ValidationError[] {
    const currentError = parentPath
      ? this.prependConstraintsWithParentProp(parentPath, error)
      : error;
    if (!(error.children && error.children.length)) {
      validationErrors.push(currentError);
      return validationErrors;
    }
    if (error.constraints) {
      validationErrors.push(currentError);
    }
    parentPath = parentPath
      ? `${parentPath}.${error.property}`
      : error.property;
    for (const item of error.children) {
      // Nested errors go into the same list: copying each level's list into
      // its parent took as many copies as depth times leaves, and spreading
      // a long one into push() threw a RangeError.
      const nested = this.mapChildrenToValidationErrors(
        item,
        parentPath,
        validationErrors,
      );
      if (nested !== validationErrors) {
        // an override returned a list of its own
        for (const nestedError of nested) {
          validationErrors.push(nestedError);
        }
      }
    }
    return validationErrors;
  }

  protected prependConstraintsWithParentProp(
    parentPath: string,
    error: ValidationError,
  ): ValidationError {
    const constraints = {};
    for (const key in error.constraints) {
      constraints[key] = `${parentPath}.${error.constraints[key]}`;
    }
    return {
      ...error,
      constraints,
    };
  }
}
