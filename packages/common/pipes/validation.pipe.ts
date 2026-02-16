import { iterate } from 'iterare';
import { types } from 'util';
import { Injectable } from '../decorators/core/index.js';
import { Optional } from '../decorators/index.js';
import { HttpStatus } from '../enums/http-status.enum.js';
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
import { loadPackage } from '../utils/load-package.util.js';
import { isNil, isUndefined } from '../utils/shared.utils.js';

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
}

let classValidator: any = {} as any;
let classTransformer: any = {} as any;

/**
 * Built-in JavaScript types that should be excluded from prototype stripping
 * to avoid conflicts with test frameworks like Jest's useFakeTimers
 */
const BUILT_IN_TYPES = [Date, RegExp, Error, Map, Set, WeakMap, WeakSet];

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

  constructor(@Optional() options?: ValidationPipeOptions) {
    options = options || {};
    const {
      transform,
      disableErrorMessages,
      errorHttpStatusCode,
      expectedType,
      transformOptions,
      validateCustomDecorators,
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
    this.exceptionFactory =
      options.exceptionFactory || this.createExceptionFactory();

    classValidator = this.loadValidator(options.validatorPackage);
    classTransformer = this.loadTransformer(options.transformerPackage);
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
      return this.isTransformEnabled
        ? this.transformPrimitive(value, metadata)
        : value;
    }

    classValidator = (await classValidator) as ValidatorPackage;
    classTransformer = (await classTransformer) as TransformerPackage;

    const originalValue = value;
    value = this.toEmptyIfNil(value, metatype);

    const isNil = value !== originalValue;
    const isPrimitive = this.isPrimitive(value);
    this.stripProtoKeys(value);
    let entity = classTransformer.plainToInstance(
      metatype,
      value,
      this.transformOptions,
    );

    const originalEntity = entity;
    const isCtorNotEqual = entity.constructor !== metatype;

    if (isCtorNotEqual && !isPrimitive) {
      entity.constructor = metatype;
    } else if (isCtorNotEqual) {
      // when "entity" is a primitive value, we have to temporarily
      // replace the entity to perform the validation against the original
      // metatype defined inside the handler
      entity = { constructor: metatype };
    }

    const errors = await this.validate(entity, this.validatorOptions);
    if (errors.length > 0) {
      throw await this.exceptionFactory(errors);
    }

    if (originalValue === undefined && originalEntity === '') {
      // Since SWC requires empty string for validation (to avoid an error),
      // a fallback is needed to revert to the original value (when undefined).
      // @see [https://github.com/nestjs/nest/issues/14430](https://github.com/nestjs/nest/issues/14430)
      return originalValue;
    }
    if (isPrimitive) {
      // if the value is a primitive value and the validation process has been successfully completed
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
      const errors = this.flattenValidationErrors(validationErrors);
      return new HttpErrorByCode[this.errorHttpStatusCode](errors);
    };
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

  protected stripProtoKeys(value: any) {
    if (
      value == null ||
      typeof value !== 'object' ||
      types.isTypedArray(value)
    ) {
      return;
    }

    // Skip built-in JavaScript primitives to avoid Jest useFakeTimers conflicts
    if (BUILT_IN_TYPES.some(type => value instanceof type)) {
      return;
    }

    if (Array.isArray(value)) {
      for (const v of value) {
        this.stripProtoKeys(v);
      }
      return;
    }

    // Delete dangerous prototype pollution keys
    delete value.__proto__;
    delete value.prototype;

    // Only delete constructor if it's NOT a built-in type
    const constructorType = value?.constructor;
    if (constructorType && !BUILT_IN_TYPES.includes(constructorType)) {
      delete value.constructor;
    }

    for (const key in value) {
      this.stripProtoKeys(value[key]);
    }
  }

  protected isPrimitive(value: unknown): boolean {
    return ['number', 'boolean', 'string'].includes(typeof value);
  }

  protected validate(
    object: object,
    validatorOptions?: ValidatorOptions,
  ): Promise<ValidationError[]> | ValidationError[] {
    return classValidator.validate(object, validatorOptions);
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

  protected mapChildrenToValidationErrors(
    error: ValidationError,
    parentPath?: string,
  ): ValidationError[] {
    if (!(error.children && error.children.length)) {
      return [error];
    }
    const validationErrors: ValidationError[] = [];
    parentPath = parentPath
      ? `${parentPath}.${error.property}`
      : error.property;
    for (const item of error.children) {
      if (item.children && item.children.length) {
        validationErrors.push(
          ...this.mapChildrenToValidationErrors(item, parentPath),
        );
      }
      validationErrors.push(
        this.prependConstraintsWithParentProp(parentPath, item),
      );
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
