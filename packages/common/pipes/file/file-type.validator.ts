import { FileValidator } from './file-validator.interface';

export type FileTypeValidatorOptions = {
  fileType: string;
};

/**
 * Defines the built-in FileType File Validator
 *
 * @see [File Validators](https://docs.nestjs.com/techniques/file-upload#validators)
 *
 * @publicApi
 */
export class FileTypeValidator extends FileValidator<FileTypeValidatorOptions> {
  buildErrorMessage(): string {
    return `Validation failed (expected type is ${this.validationOptions.fileType})`;
  }

  isValid(file: any): boolean {
    if (!this.validationOptions) {
      return true;
    }

    return file.mimetype === this.validationOptions.fileType;
  }
}
