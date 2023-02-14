import { iterate } from 'iterare';
import { types } from 'util';
import { Optional } from '../decorators';
import { Injectable } from '../decorators/core';
import { HttpStatus } from '../enums/http-status.enum';
import { ClassTransformOptions } from '../interfaces/external/class-transform-options.interface';
import { TransformerPackage } from '../interfaces/external/transformer-package.interface';
import { ValidationError } from '../interfaces/external/validation-error.interface';
import { ValidatorOptions } from '../interfaces/external/validator-options.interface';
import { ValidatorPackage } from '../interfaces/external/validator-package.interface';
import {
  ArgumentMetadata,
  PipeTransform,
} from '../interfaces/features/pipe-transform.interface';
import { Type } from '../interfaces/type.interface';
import {
  ErrorHttpStatusCode,
  HttpErrorByCode,
} from '../utils/http-error-by-code.util';
import { loadPackage } from '../utils/load-package.util';
import { isNil } from '../utils/shared.utils';

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

let classValidator: ValidatorPackage = {} as any;
let classTransformer: TransformerPackage = {} as any;

/**
 * @see [Validation](https://docs.nestjs.com/techniques/validation)
 *
 * @publicApi
 */
@Injectable()
export class ValidationPipe implements PipeTransform<any> {
  protected isTransformEnabled: boolean;
  protected isDetailedOutputDisabled?: boolean;
  protected validatorOptions: ValidatorOptions;
  protected transformOptions: ClassTransformOptions;
  protected errorHttpStatusCode: ErrorHttpStatusCode;
  protected expectedType: Type<any>;
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

    // @see https://github.com/nestjs/nest/issues/10683#issuecomment-1413690508
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
  ): ValidatorPackage {
    return (
      validatorPackage ??
      loadPackage('class-validator', 'ValidationPipe', () =>
        require('class-validator'),
      )
    );
  }

  protected loadTransformer(
    transformerPackage?: TransformerPackage,
  ): TransformerPackage {
    return (
      transformerPackage ??
      loadPackage('class-transformer', 'ValidationPipe', () =>
        require('class-transformer'),
      )
    );
  }

  public async transform(value: any, metadata: ArgumentMetadata) {
    if (this.expectedType) {
      metadata = { ...metadata, metatype: this.expectedType };
    }

    const metatype = metadata.metatype;
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

    const errors = await this.validate(entity, this.validatorOptions);
    if (errors.length > 0) {
      throw await this.exceptionFactory(errors);
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
    const types = [String, Boolean, Number, Array, Object, Buffer];
    return !types.some(t => metatype === t) && !isNil(metatype);
  }

  protected transformPrimitive(value: any, metadata: ArgumentMetadata) {
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

  protected toEmptyIfNil<T = any, R = any>(value: T): R | {} {
    return isNil(value) ? {} : value;
  }

  protected stripProtoKeys(value: any) {
    if (
      value == null ||
      typeof value !== 'object' ||
      types.isTypedArray(value)
    ) {
      return;
    }
    if (Array.isArray(value)) {
      for (const v of value) {
        this.stripProtoKeys(v);
      }
      return;
    }
    delete value.__proto__;
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
      .map(item => Object.values(item.constraints))
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
    const validationErrors = [];
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
