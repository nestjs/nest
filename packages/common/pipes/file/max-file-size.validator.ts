import { FileValidator } from './file-validator.interface';
import { IFile } from './interfaces';

export type MaxFileSizeValidatorOptions = {
  /**
   * Maximum allowed file size in bytes.
   */
  maxSize: number;

  /**
   * Custom error message returned when file size validation fails.
   * This can be either a static string or a function that receives the `maxSize` value
   * and returns a dynamic message.
   *
   * @example
   * // Static message
   * new MaxFileSizeValidator({ maxSize: 1000, message: 'File size exceeds the limit' })
   *
   * @example
   * // Dynamic message based on maxSize
   * new MaxFileSizeValidator({
   *   maxSize: 1000,
   *   message: (max) => `Maximum allowed file size is ${max} bytes`
   * })
   */
  message?: string | ((maxSize: number) => string);
};

/**
 * Defines the built-in MaxSize File Validator
 *
 * @see [File Validators](https://docs.nestjs.com/techniques/file-upload#file-validation)
 *
 * @publicApi
 */
export class MaxFileSizeValidator extends FileValidator<
  MaxFileSizeValidatorOptions,
  IFile
> {
  buildErrorMessage(file?: IFile): string {
    if ('message' in this.validationOptions) {
      if (typeof this.validationOptions.message === 'function') {
        return this.validationOptions.message(this.validationOptions.maxSize);
      }

      return this.validationOptions.message!;
    }

    if (file?.size) {
      return `Validation failed (current file size is ${file.size}, expected size is less than ${this.validationOptions.maxSize})`;
    }
    return `Validation failed (expected size is less than ${this.validationOptions.maxSize})`;
  }

  public isValid(file?: IFile): boolean {
    if (!this.validationOptions || !file) {
      return true;
    }

    return 'size' in file && file.size < this.validationOptions.maxSize;
  }
}
