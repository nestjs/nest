import { ValidatorOptions } from 'class-validator';
import { PipeTransform } from '../interfaces/pipe-transform.interface';
import { ArgumentMetadata } from '../index';
export interface ValidationPipeOptions extends ValidatorOptions {
  transform?: boolean;
}
export declare class ValidationPipe implements PipeTransform<any> {
  private isTransformEnabled;
  private validatorOptions;
  constructor(options?: ValidationPipeOptions);
  transform(value: any, metadata: ArgumentMetadata): Promise<any>;
  private toValidate(metadata);
}
