import { loadEsm } from 'load-esm';
import { FileValidator } from './file-validator.interface';
import { FileTypeValidatorOptions, IFileWithBuffer } from './interfaces';

const fileTypePromise = loadEsm('file-type').then(
  module => module.fileTypeFromBuffer,
);

/**
 * Defines the built-in MagicFileType Validator. It validates incoming files by examining
 * their magic numbers using the file-type package, providing more reliable file type validation
 * than just checking the mimetype string.
 *
 * @see [File Validators](https://docs.nestjs.com/techniques/file-upload#validators)
 *
 * @publicApi
 */
export class MagicFileTypeValidator extends FileValidator<
  FileTypeValidatorOptions,
  IFileWithBuffer
> {
  buildErrorMessage(file?: IFileWithBuffer): string {
    if (file?.mimetype) {
      return `Validation failed (detected file type is ${file.mimetype}, expected type is ${this.validationOptions.fileType})`;
    }
    return `Validation failed (expected type is ${this.validationOptions.fileType})`;
  }

  async isValid(file?: IFileWithBuffer): Promise<boolean> {
    if (!this.validationOptions || !file || !file.buffer) {
      return false;
    }

    try {
      const fileTypeFromBufferFn = await fileTypePromise;
      const fileType = await fileTypeFromBufferFn(file.buffer);
      if (!fileType) {
        return false;
      }

      const detectedMimeType = fileType.mime;

      if (this.validationOptions.fileType instanceof RegExp) {
        return this.validationOptions.fileType.test(detectedMimeType);
      }

      return (
        detectedMimeType === this.validationOptions.fileType ||
        detectedMimeType.endsWith(this.validationOptions.fileType)
      );
    } catch {
      return false;
    }
  }
}
