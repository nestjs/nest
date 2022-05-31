export abstract class FileValidator<TValidationOptions = Record<string, any>> {
  constructor(protected readonly validationOptions: TValidationOptions) {}

  abstract isValid(file?: any): boolean;
  abstract buildErrorMessage(file: any): string;
}
