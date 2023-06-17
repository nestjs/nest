import { FileValidator } from './file-validator.interface';
import { IFile } from './interfaces';

export type FileTypeValidatorOptions = {
  fileType: string | RegExp;
};

/**
 * Defines the built-in FileType File Validator. It validates incoming files mime-type
 * matching a string or a regular expression. Note that this validator uses a naive strategy
 * to check the mime-type and could be fooled if the client provided a file with renamed extension.
 * (for instance, renaming a 'malicious.bat' to 'malicious.jpeg'). To handle such security issues
 * with more reliability, consider checking against the file's [magic-numbers](https://en.wikipedia.org/wiki/Magic_number_%28programming%29)
 *
 * @see [File Validators](https://docs.nestjs.com/techniques/file-upload#validators)
 *
 * @publicApi
 */
export class FileTypeValidator extends FileValidator<FileTypeValidatorOptions> {
  buildErrorMessage(): string {
    return `Validation failed (expected type is ${this.validationOptions.fileType})`;
  }

  isValid<TFile extends IFile = any>(file?: TFile): boolean {
    if (!this.validationOptions) {
      return true;
    }

    return (
      !!file &&
      'mimetype' in file &&
      !!file.mimetype.match(this.validationOptions.fileType)
    );
  }
}
