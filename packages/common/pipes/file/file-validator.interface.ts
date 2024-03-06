import { IFile } from './interfaces';

/**
 * Interface describing FileValidators, which can be added to a ParseFilePipe
 *
 * @see {ParseFilePipe}
 * @publicApi
 */
export abstract class FileValidator<
  TValidationOptions = Record<string, any>,
  TFile extends IFile = IFile,
> {
  constructor(protected readonly validationOptions: TValidationOptions) {}

  /**
   * Indicates if this file should be considered valid, according to the options passed in the constructor.
   * @param file the file from the request object
   */
  abstract isValid(
    file?: TFile | TFile[] | Record<string, TFile[]>,
  ): boolean | Promise<boolean>;

  /**
   * Builds an error message in case the validation fails.
   * @param file the file from the request object
   */
  abstract buildErrorMessage(file: any): string;
}
