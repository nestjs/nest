import { FileValidator } from './file-validator.interface';
import { FileTypeValidatorOptions, IFile } from './interfaces';

const importEsmPackage = async (
  packageName: string,
): Promise<typeof import('file-type')> =>
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  new Function(`return import('${packageName}')`)().then(
    (loadedModule: any) => loadedModule['default'] ?? loadedModule,
  );

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

  async isValid(file?: IFile): Promise<boolean> {
    if (!this.validationOptions) {
      return true;
    }

    if (!file || !file?.buffer || !file?.mimetype) {
      return false;
    }

    try {
      const { fileTypeFromBuffer } = await importEsmPackage('file-type');

      const fileType = await fileTypeFromBuffer(file.buffer);

      return (
        !!fileType && !!fileType.mime.match(this.validationOptions.fileType)
      );
    } catch {
      return false;
    }
  }
}
