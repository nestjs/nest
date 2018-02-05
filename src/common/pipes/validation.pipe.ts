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

  private returnTransformed: boolean;

  private validatorOptions: ValidatorOptions;

  constructor(options?: ValidationPipeOptions) {
    options = options || {};
    const { transform, ...validatorOptions } = options;
    this.returnTransformed = transform != null ? transform : true;
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
    return this.returnTransformed ? entity
      : Object.keys(this.validatorOptions) ? classToPlain(entity)
      : value;
  }

  private toValidate(metatype): boolean {
    const types = [String, Boolean, Number, Array, Object];
    return !types.find(type => metatype === type) && !isNil(metatype);
  }
}
