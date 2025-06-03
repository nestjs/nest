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

    if (!isFileValid || !file.buffer) return false;

    try {
      // const { fileTypeFromBuffer } =
      //   await loadEsm<typeof import('file-type')>('file-type');
      const { fileTypeFromBuffer } = await import('file-type');
      const fileType = await fileTypeFromBuffer(file.buffer);

      // fallback logic
      const detectedMime = fileType?.mime || file.mimetype;

      // allow if JPEG
      if (!['image/jpeg', 'image/png', 'image/jpg'].includes(detectedMime)) {
        return false;
      }

      if (fileType) {
        // Match detected mime type against allowed type
        return !!fileType.mime.match(this.validationOptions.fileType);
      }

      if (this.validationOptions.fallbackToMimetype) {
        if (file.mimetype.match(this.validationOptions.fileType)) {
          return true;
        }

        // 5. Additional fallback: check extension for `application/octet-stream`
        if (file.mimetype === 'application/octet-stream') {
          const extension = file.originalname?.split('.').pop()?.toLowerCase();

          // Add more extensions and their MIME mappings as needed
          const extensionMimeMap: Record<string, string> = {
            csv: 'text/csv',
            txt: 'text/plain',
            docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            pdf: 'application/pdf',
            json: 'application/json',
          };

          const inferredMime = extensionMimeMap[extension || ''];

          if (
            inferredMime &&
            inferredMime.match(this.validationOptions.fileType)
          ) {
            return true;
          }
        }
      }

      /**
       * Fallback logic: If file-type cannot detect magic number (e.g. file too small),
       * Optionally fall back to mimetype string for compatibility.
       * This is useful for plain text, CSVs, or files without recognizable signatures.
       */
      // if (this.validationOptions.fallbackToMimetype) {
      //   return !!file.mimetype.match(this.validationOptions.fileType);
      // }
      return false;
    } catch {
      return false;
    }
  }
}
