import iterate from 'iterare';
import { Optional } from '../decorators';
import { Injectable } from '../decorators/core';
import {
  ArgumentMetadata,
  BadRequestException,
  ValidationError,
} from '../index';
import { ClassTransformOptions } from '../interfaces/external/class-transform-options.interface';
import { ValidatorOptions } from '../interfaces/external/validator-options.interface';
import { PipeTransform } from '../interfaces/features/pipe-transform.interface';
import { loadPackage } from '../utils/load-package.util';
import { isNil } from '../utils/shared.utils';

export interface ValidationPipeOptions extends ValidatorOptions {
  transform?: boolean;
  disableErrorMessages?: boolean;
  transformOptions?: ClassTransformOptions;
  exceptionFactory?: (errors: ValidationError[]) => any;
  validateCustomDecorators?: boolean;
}

let classValidator: any = {};
let classTransformer: any = {};

@Injectable()
export class ValidationPipe implements PipeTransform<any> {
  protected isTransformEnabled: boolean;
  protected isDetailedOutputDisabled?: boolean;
  protected validatorOptions: ValidatorOptions;
  protected transformOptions: ClassTransformOptions;
  protected exceptionFactory: (errors: ValidationError[]) => any;
  protected validateCustomDecorators: boolean;

  constructor(@Optional() options?: ValidationPipeOptions) {
    options = options || {};
    const {
      transform,
      disableErrorMessages,
      transformOptions,
      validateCustomDecorators,
      ...validatorOptions
    } = options;
    this.isTransformEnabled = !!transform;
    this.validatorOptions = validatorOptions;
    this.transformOptions = transformOptions;
    this.isDetailedOutputDisabled = disableErrorMessages;
    this.validateCustomDecorators = validateCustomDecorators || false;
    this.exceptionFactory =
      options.exceptionFactory || this.createExceptionFactory();

    classValidator = loadPackage('class-validator', 'ValidationPipe', () =>
      require('class-validator'),
    );
    classTransformer = loadPackage('class-transformer', 'ValidationPipe', () =>
      require('class-transformer'),
    );
  }

  public async transform(value: any, metadata: ArgumentMetadata) {
    const { metatype } = metadata;
    if (!metatype || !this.toValidate(metadata)) {
      return this.isTransformEnabled
        ? this.transformPrimitive(value, metadata)
        : value;
    }
    const originalValue = value;
    value = this.toEmptyIfNil(value);

    const isNil = value !== originalValue;
    const isPrimitive = this.isPrimitive(value);
    this.stripProtoKeys(value);
    let entity = classTransformer.plainToClass(
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

    const errors = await classValidator.validate(entity, this.validatorOptions);
    if (errors.length > 0) {
      throw this.exceptionFactory(errors);
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
    return Object.keys(this.validatorOptions).length > 0
      ? classTransformer.classToPlain(entity, this.transformOptions)
      : value;
  }

  public createExceptionFactory() {
    const prependConstraintsWithParentProp = (
      parentError: ValidationError,
      error: ValidationError,
    ) => {
      const newConstraints = Object.keys(error.constraints).reduce(
        (acc, k) => ({
          ...acc,
          [k]: `${parentError.property} ${error.constraints[k]}`,
        }),
        {},
      );
      return {
        ...error,
        constraints: newConstraints,
      };
    };

    const mapChildrenToValidationErrors = (error: ValidationError) => {
      if (!error.children || !error.children.length) {
        return error;
      }
      return iterate(error.children).reduce(
        (acc, childError) => [
          ...acc,
          ...(childError.children && childError.children.length
            ? mapChildrenToValidationErrors(childError)
            : [prependConstraintsWithParentProp(error, childError)]),
        ],
        [],
      );
    };

    const mapValidationErrors = (validationErrors: ValidationError[] = []) => {
      return iterate(validationErrors)
        .map(mapChildrenToValidationErrors)
        .flatten()
        .filter(item => !!item.constraints)
        .map(item => Object.values(item.constraints))
        .flatten()
        .toArray();
    };

    return (validationErrors: ValidationError[] = []) => {
      if (this.isDetailedOutputDisabled) {
        return new BadRequestException();
      }
      const errors = mapValidationErrors(validationErrors);

      return new BadRequestException(errors);
    };
  }

  private toValidate(metadata: ArgumentMetadata): boolean {
    const { metatype, type } = metadata;
    if (type === 'custom' && !this.validateCustomDecorators) {
      return false;
    }
    const types = [String, Boolean, Number, Array, Object];
    return !types.some(t => metatype === t) && !isNil(metatype);
  }

  private transformPrimitive(value: any, metadata: ArgumentMetadata) {
    if (!metadata.data) {
      // leave top-level query/param objects unmodified
      return value;
    }
    const { type, metatype } = metadata;
    if (type !== 'param' && type !== 'query') {
      return value;
    }
    if (metatype === Boolean) {
      return value === true || value === 'true';
    }
    if (metatype === Number) {
      return +value;
    }
    return value;
  }

  private toEmptyIfNil<T = any, R = any>(value: T): R | {} {
    return isNil(value) ? {} : value;
  }

  private stripProtoKeys(value: Record<string, any>) {
    delete value.__proto__;
    const keys = Object.keys(value);
    keys
      .filter(key => typeof value[key] === 'object' && value[key])
      .forEach(key => this.stripProtoKeys(value[key]));
  }

  private isPrimitive(value: unknown): boolean {
    return ['number', 'boolean', 'string'].includes(typeof value);
  }
}
