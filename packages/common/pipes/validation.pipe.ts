import { Optional } from '../decorators';
import { ArgumentMetadata, BadRequestException, Type } from '../index';
import { ValidatorOptions } from '../interfaces/external/validator-options.interface';
import { PipeTransform } from '../interfaces/features/pipe-transform.interface';
import { loadPackage } from '../utils/load-package.util';
import { isNil } from '../utils/shared.utils';
import { Injectable } from '../decorators/core/component.decorator';

export interface ValidationPipeOptions extends ValidatorOptions {
  transform?: boolean;
  disableErrorMessages?: boolean;
}

let classValidator: any = {};
let classTransformer: any = {};

@Injectable()
export class ValidationPipe implements PipeTransform<any> {
  protected readonly isTransformEnabled: boolean;
  protected readonly isDetailedOutputDisabled?: boolean;
  protected readonly validatorOptions: ValidatorOptions;

  constructor(@Optional() options?: ValidationPipeOptions) {
    const { transform, disableErrorMessages, ...validatorOptions }: ValidationPipeOptions  = options || {};
    this.isTransformEnabled = !!transform;
    this.validatorOptions = validatorOptions;
    this.isDetailedOutputDisabled = disableErrorMessages;

    const loadPkg = pkg => loadPackage(pkg, 'ValidationPipe');
    classValidator = loadPkg('class-validator');
    classTransformer = loadPkg('class-transformer');
  }

  public async transform(value: any, metadata: ArgumentMetadata): Promise<any> {
    const { metatype } = metadata;
    if (!metatype || !this.toValidate(metadata)) {
      return value;
    }
    const entity = classTransformer.plainToClass(
      metatype,
      this.toEmptyIfNil(value),
    );
    const errors = await classValidator.validate(entity, this.validatorOptions);
    if (errors.length > 0) {
      throw new BadRequestException(
        this.isDetailedOutputDisabled ? undefined : errors,
      );
    }
    return this.isTransformEnabled
      ? entity
      : Object.keys(this.validatorOptions).length > 0
        ? classTransformer.classToPlain(entity)
        : value;
  }

  private toValidate(metadata: ArgumentMetadata): boolean {
    const { metatype, type } = metadata;
    if (type === 'custom') {
      return false;
    }
    const types = [String, Boolean, Number, Array, Object] as ReadonlyArray<Type<any>>;
    return !types.some((t: Type<any>) => metatype === t);
  }

  private toEmptyIfNil<T = any, R = any>(value: T): R | {} {
    return isNil(value) ? {} : value;
  }
}
