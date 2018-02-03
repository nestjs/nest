import { validate } from 'class-validator';
import { classToPlain, plainToClass } from 'class-transformer';
import { PipeTransform } from '../interfaces/pipe-transform.interface';
import { ArgumentMetadata, BadRequestException } from '../index';
import { isNil } from '../utils/shared.utils';
import { Pipe } from './../decorators/core/component.decorator';

export interface ValidationPipeOptions {
  transform?: boolean;
  strip?: boolean;
  reject?: boolean;
}

@Pipe()
export class ValidationPipe implements PipeTransform<any> {

  private shouldTransform: boolean;
  private shouldStrip: boolean;
  private shouldReject: boolean;

  constructor(options?: ValidationPipeOptions) {
    this.shouldTransform = (options && 'transform' in options) ? options.transform : true;
    this.shouldStrip = options && (options.strip || options.reject);
    this.shouldReject = options && options.reject;
  }

  public async transform(value, metadata: ArgumentMetadata) {
    const { metatype } = metadata;
    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }
    const entity = plainToClass(metatype, value);
    const errors = await validate(entity, { whitelist: this.shouldStrip, forbidNonWhitelisted: this.shouldReject });
    if (errors.length > 0) {
      throw new BadRequestException(errors);
    }
    return this.shouldTransform ? entity
      : this.shouldStrip ? classToPlain(entity)
      : value;
  }

  private toValidate(metatype): boolean {
    const types = [String, Boolean, Number, Array, Object];
    return !types.find(type => metatype === type) && !isNil(metatype);
  }
}
