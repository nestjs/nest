import { validate, ValidatorOptions } from 'class-validator';
import { classToPlain, plainToClass } from 'class-transformer';
import { PipeTransform } from '../interfaces/pipe-transform.interface';
import { ArgumentMetadata, BadRequestException } from '../index';
import { isNil } from '../utils/shared.utils';
import { Pipe } from './../decorators/core/component.decorator';

export interface ValidationPipeOptions extends ValidatorOptions {
  transform?: boolean;
}

@Pipe()
export class ValidationPipe implements PipeTransform<any> {
  private isTransformEnabled: boolean;
  private validatorOptions: ValidatorOptions;

  constructor(options: ValidationPipeOptions = {}) {
    const { transform, ...validatorOptions } = options;
    this.isTransformEnabled = !!transform ? transform : true;
    this.validatorOptions = validatorOptions;
  }

  public async transform(value, metadata: ArgumentMetadata) {
    const { metatype } = metadata;
    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }
    const entity = plainToClass(metatype, value);
    const errors = await validate(entity, this.validatorOptions);
    if (errors.length > 0) {
      throw new BadRequestException(errors);
    }
    return this.isTransformEnabled
      ? entity
      : Object.keys(this.validatorOptions) ? classToPlain(entity) : value;
  }

  private toValidate(metatype): boolean {
    const types = [String, Boolean, Number, Array, Object];
    return !types.find(type => metatype === type) && !isNil(metatype);
  }
}
