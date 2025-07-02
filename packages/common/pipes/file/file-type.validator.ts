import { FileValidator } from './file-validator.interface';
import { IFile } from './interfaces';
import { loadEsm } from 'load-esm';

export type FileTypeValidatorOptions = {
  fileType: string | RegExp;

  /**
   * If `true`, the validator will skip the magic numbers validation.
   * This can be useful when you can't identify some files as there are no common magic numbers available for some file types.
   * @default false
   */
  skipMagicNumbersValidation?: boolean;

  /**
   * If `true`, and magic number check fails, fallback to mimetype comparison.
   * @default false
   */
  fallbackToMimetype?: boolean;
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
  buildErrorMessage(file?: IFile): string {
    const expected = this.validationOptions.fileType;

    if (file?.mimetype) {
      const baseMessage = `Validation failed (current file type is ${file.mimetype}, expected type is ${expected})`;

      /**
       * If fallbackToMimetype is enabled, this means the validator failed to detect the file type
       * via magic number inspection (e.g. due to an unknown or too short buffer),
       * and instead used the mimetype string provided by the client as a fallback.
       *
       * This message clarifies that fallback logic was used, in case users rely on file signatures.
       */
      if (this.validationOptions.fallbackToMimetype) {
        return `${baseMessage} - magic number detection failed, used mimetype fallback`;
      }

      return baseMessage;
    }

    return `Validation failed (expected type is ${expected})`;
  }

  async isValid(file?: IFile): Promise<boolean> {
    const isFileValid = !!file && 'mimetype' in file;
    console.log('isFileValid', isFileValid);

    if (!isFileValid || !file.buffer) {
      console.log('Fallback path hit');
      if (
        this.validationOptions?.fallbackToMimetype ||
        this.validationOptions?.skipMagicNumbersValidation
      ) {
        return !!file?.mimetype?.match(this.validationOptions.fileType);
      }
      return false;
    }

    if (this.validationOptions?.skipMagicNumbersValidation) {
      console.log('Skipping magic number check');
      return !!file.mimetype.match(this.validationOptions.fileType);
    }

    try {
      const { fileTypeFromBuffer } = await loadEsm<any>('file-type');
      const fileType = await fileTypeFromBuffer(file.buffer);
      console.log('Detected fileType:', fileType);

      if (fileType) {
        return !!fileType.mime.match(this.validationOptions.fileType);
      }

      if (this.validationOptions?.fallbackToMimetype) {
        console.log('Fallback to mimetype:', file.mimetype);
        return !!file.mimetype.match(this.validationOptions.fileType);
      }

      return false;
    } catch (err) {
      console.error('Error in fileTypeFromBuffer:', err);
      return false;
    }
  }
}
