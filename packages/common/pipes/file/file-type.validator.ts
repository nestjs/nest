import { FileValidator } from './file-validator.interface';
import { IFile } from './interfaces';

export type FileTypeValidatorOptions = {
  fileType: string | RegExp;

  /**
   * If `true`, the validator will skip the magic numbers validation.
   * This can be useful when you can't identify some files as there are no common magic numbers available for some file types.
   * @default false
   */
  skipMagicNumbersValidation?: boolean;
};

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
  constructor(validationOptions: FileTypeValidatorOptions) {
    super(validationOptions);

    // check if file-type is installed
    try {
      require.resolve('file-type');
    } catch (e) {
      throw new Error(
        `FileTypeValidator requires the file-type package. Please install it: npm i file-type`,
      );
    }
  }

  buildErrorMessage(file?: IFile): string {
    if (file?.mimetype) {
      return `Validation failed (current file type is ${file.mimetype}, expected type is ${this.validationOptions.fileType})`;
    }
    return `Validation failed (expected type is ${this.validationOptions.fileType})`;
  }

  async isValid(file?: IFile): Promise<boolean> {
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
      const { fileTypeFromBuffer } = (await eval(
        'import ("file-type")',
      )) as typeof import('file-type');

      const fileType = await fileTypeFromBuffer(file.buffer);

      return (
        !!fileType && !!fileType.mime.match(this.validationOptions.fileType)
      );
    } catch {
      return false;
    }
  }
}
