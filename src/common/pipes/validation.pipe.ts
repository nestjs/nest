import { validate, ValidatorOptions } from 'class-validator';
import { classToPlain, plainToClass } from 'class-transformer';
import { PipeTransform } from '../interfaces/pipe-transform.interface';
import { ArgumentMetadata, BadRequestException } from '../index';
import { isNil } from '../utils/shared.utils';
import { Pipe } from './../decorators/core/component.decorator';

export interface ValidationPipeOptions {
  transform?: boolean;
  whitelist?: boolean;
  forbidNonWhitelisted?: boolean;
}

@Pipe()
export class ValidationPipe implements PipeTransform<any> {

  private returnTransformed: boolean;

  private validatorOptions: ValidatorOptions = {};

  constructor(options?: ValidationPipeOptions) {
    this.returnTransformed = (options && 'transform' in options) ? options.transform : true;
    this.validatorOptions.whitelist = options && (options.whitelist || options.forbidNonWhitelisted);
    this.validatorOptions.forbidNonWhitelisted = options && options.forbidNonWhitelisted;
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
      : this.validatorOptions.whitelist ? classToPlain(entity)
      : value;
  }

  private toValidate(metatype): boolean {
    const types = [String, Boolean, Number, Array, Object];
    return !types.find(type => metatype === type) && !isNil(metatype);
  }
}
