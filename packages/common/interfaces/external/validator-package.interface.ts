import { ValidationError } from './validation-error.interface.js';
import { ValidatorOptions } from './validator-options.interface.js';

export interface ValidatorPackage {
  validate(
    object: unknown,
    validatorOptions?: ValidatorOptions,
  ): ValidationError[] | Promise<ValidationError[]>;
}
