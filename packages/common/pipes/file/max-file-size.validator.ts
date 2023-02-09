import { FileValidator } from './file-validator.interface';
import { IFile } from './interfaces';

export type MaxFileSizeValidatorOptions = {
  maxSize: number;
};

/**
 * Defines the built-in MaxSize File Validator
 *
 * @see [File Validators](https://docs.nestjs.com/techniques/file-upload#validators)
 *
 * @publicApi
 */
export class MaxFileSizeValidator extends FileValidator<MaxFileSizeValidatorOptions> {
  buildErrorMessage(): string {
    return `Validation failed (expected size is less than ${this.validationOptions.maxSize})`;
  }

  public isValid<TFile extends IFile = any>(file: TFile): boolean {
    if (!this.validationOptions) {
      return true;
    }

    return 'size' in file && file.size < this.validationOptions.maxSize;
  }
}
