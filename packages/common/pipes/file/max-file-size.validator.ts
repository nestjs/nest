import { FileValidator } from './file-validator.interface';

export type MaxFileSizeValidatorOptions = {
  maxSize: number;
};

export class MaxFileSizeValidator extends FileValidator<MaxFileSizeValidatorOptions> {
  buildErrorMessage(): string {
    return `Validation failed (expected size is less than ${this.validationOptions.maxSize})`;
  }

  public isValid(file: any): boolean {
    if (!this.validationOptions) return true;

    return file.size < this.validationOptions.maxSize;
  }
}
