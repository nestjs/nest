import { FileValidatorContext } from './file-validator-context.interface';
import { FileValidator } from './file-validator.interface';
import { IFile } from './interfaces';

type MaxFileSizeValidatorContext = FileValidatorContext<
  Omit<MaxFileSizeValidatorOptions, 'errorMessage' | 'message'>
>;

export type MaxFileSizeValidatorOptions = {
  /**
   * Maximum allowed file size in bytes.
   */
  maxSize: number;

  /**
   * @deprecated Use `errorMessage` instead.
   */
  message?: string | ((maxSize: number) => string);

  /**
   * Custom error message returned when file size validation fails.
   * Can be provided as a static string, or as a factory function
   * that receives the validation context (file and validator configuration)
   * and returns a dynamic error message.
   *
   * @example
   * // Static message
   * new MaxFileSizeValidator({ maxSize: 1000, errorMessage: 'File size exceeds the limit' })
   *
   * @example
   * // Dynamic message based on file object and validator configuration
   * new MaxFileSizeValidator({
   *   maxSize: 1000,
   *   errorMessage: ctx => `Received file size is ${ctx.file?.size}, but it must be smaller than ${ctx.config.maxSize}.`
   * })
   */
  errorMessage?: string | ((ctx: MaxFileSizeValidatorContext) => string);
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
    const { errorMessage, message, ...config } = this.validationOptions;

    if (errorMessage) {
      return typeof errorMessage === 'function'
        ? errorMessage({ file, config })
        : errorMessage;
    }

    if (message) {
      return typeof message === 'function'
        ? message(this.validationOptions.maxSize)
        : message;
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
