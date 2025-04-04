import * as fileTypeChecker from 'file-type-checker';
import { FileValidator } from './file-validator.interface';
import { FileTypeValidatorOptions, IFile } from './interfaces';

/**
 * Defines the built-in FileTypeValidator. It validates incoming files by examining
 * their magic numbers using the file-type package, providing more reliable file type validation
 * than just checking the mimetype string.
 *
 * @see [File Validators](https://docs.nestjs.com/techniques/file-upload#validators)
 *
 * @publicApi
 */
export class FileTypeValidator extends FileValidator<
  FileTypeValidatorOptions,
  IFile
> {
  buildErrorMessage(file?: IFile): string {
    if (file?.mimetype) {
      return `Validation failed (detected file type is ${file.mimetype}, expected type is ${this.validationOptions.fileType})`;
    }
    return `Validation failed (expected type is ${this.validationOptions.fileType})`;
  }

  isValid(file?: IFile): boolean {
    if (!this.validationOptions) {
      return true;
    }

    const isFileValid = !!file && 'mimetype' in file;

    if (this.validationOptions.skipMagicNumbersValidation) {
      return (
        isFileValid && !!file.mimetype.match(this.validationOptions.fileType)
      );
    }

    if (!isFileValid || !file.buffer) {
      return false;
    }

    try {
      const fileType = fileTypeChecker.detectFile(file.buffer);

      return (
        !!fileType && !!fileType.mimeType.match(this.validationOptions.fileType)
      );
    } catch {
      return false;
    }
  }
}
