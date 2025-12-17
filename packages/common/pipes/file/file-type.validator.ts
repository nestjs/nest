import { Logger } from '../../services/logger.service';
import { FileValidator } from './file-validator.interface';
import { IFile } from './interfaces';
import { loadEsm } from 'load-esm';

const logger = new Logger('FileTypeValidator');

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
    if (!this.validationOptions) {
      return true;
    }

    const isFileValid = !!file && 'mimetype' in file;

    // Skip magic number validation if set
    if (this.validationOptions.skipMagicNumbersValidation) {
      return (
        isFileValid && !!file.mimetype.match(this.validationOptions.fileType)
      );
    }

    if (!isFileValid) return false;

    if (!file.buffer) {
      if (this.validationOptions.fallbackToMimetype) {
        return !!file.mimetype.match(this.validationOptions.fileType);
      }
      return false;
    }

    try {
      let fileTypePath: string;
      try {
        fileTypePath = require.resolve('file-type');
      } catch {
        fileTypePath = 'file-type';
      }
      const { fileTypeFromBuffer } =
        await loadEsm<typeof import('file-type')>(fileTypePath);
      const fileType = await fileTypeFromBuffer(file.buffer);

      if (fileType) {
        // Match detected mime type against allowed type
        return !!fileType.mime.match(this.validationOptions.fileType);
      }

      /**
       * Fallback logic: If file-type cannot detect magic number (e.g. file too small),
       * Optionally fall back to mimetype string for compatibility.
       * This is useful for plain text, CSVs, or files without recognizable signatures.
       */
      if (this.validationOptions.fallbackToMimetype) {
        return !!file.mimetype.match(this.validationOptions.fileType);
      }
      return false;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // Check for common ESM loading issues
      if (
        errorMessage.includes('ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING') ||
        errorMessage.includes('Cannot find module') ||
        errorMessage.includes('ERR_MODULE_NOT_FOUND')
      ) {
        logger.warn(
          `Failed to load "file-type" package for magic number validation. ` +
            `If using Jest, run with NODE_OPTIONS="--experimental-vm-modules". ` +
            `Error: ${errorMessage}`,
        );
      }

      // Fallback to mimetype if enabled
      if (this.validationOptions.fallbackToMimetype) {
        return !!file.mimetype.match(this.validationOptions.fileType);
      }
      return false;
    }
  }
}
