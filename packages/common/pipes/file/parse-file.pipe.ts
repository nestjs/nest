import { Injectable, Optional } from '../../decorators/core';
import { HttpStatus } from '../../enums';
import { PipeTransform } from '../../interfaces/features/pipe-transform.interface';
import { HttpErrorByCode } from '../../utils/http-error-by-code.util';
import { isEmpty, isObject, isUndefined } from '../../utils/shared.utils';
import { FileValidator } from './file-validator.interface';
import { ParseFileOptions } from './parse-file-options.interface';

/**
 * Defines the built-in ParseFile Pipe. This pipe can be used to validate incoming files
 * with `@UploadedFile()` decorator. You can use either other specific built-in validators
 * or provide one of your own, simply implementing it through FileValidator interface
 * and adding it to ParseFilePipe's constructor.
 *
 * @see [Built-in Pipes](https://docs.nestjs.com/pipes#built-in-pipes)
 *
 * @publicApi
 */
@Injectable()
export class ParseFilePipe implements PipeTransform<any> {
  protected exceptionFactory: (error: string) => any;
  private readonly validators: FileValidator[];
  private readonly fileIsRequired: boolean;

  constructor(@Optional() options: ParseFileOptions = {}) {
    const {
      exceptionFactory,
      errorHttpStatusCode = HttpStatus.BAD_REQUEST,
      validators = [],
      fileIsRequired,
    } = options;

    this.exceptionFactory =
      exceptionFactory ||
      (error => new HttpErrorByCode[errorHttpStatusCode](error));

    this.validators = validators;
    this.fileIsRequired = fileIsRequired ?? true;
  }

  async transform(value: any): Promise<any> {
    const areThereAnyFilesIn = this.thereAreNoFilesIn(value);

    if (areThereAnyFilesIn && this.fileIsRequired) {
      throw this.exceptionFactory('File is required');
    }
    if (!areThereAnyFilesIn && this.validators.length) {
      await this.validateFilesOrFile(value);
    }

    return value;
  }

  private async validateFilesOrFile(value: any): Promise<void> {
    if (Array.isArray(value)) {
      await Promise.all(value.map(f => this.validate(f)));
    } else {
      await this.validate(value);
    }
  }

  private thereAreNoFilesIn(value: any): boolean {
    const isEmptyArray = Array.isArray(value) && isEmpty(value);
    const isEmptyObject = isObject(value) && isEmpty(Object.keys(value));
    return isUndefined(value) || isEmptyArray || isEmptyObject;
  }

  protected async validate(file: any): Promise<any> {
    for (const validator of this.validators) {
      await this.validateOrThrow(file, validator);
    }
    return file;
  }

  private async validateOrThrow(file: any, validator: FileValidator) {
    const isValid = await validator.isValid(file);

    if (!isValid) {
      const errorMessage = validator.buildErrorMessage(file);
      throw this.exceptionFactory(errorMessage);
    }
  }

  /**
   * @returns list of validators used in this pipe.
   */
  getValidators() {
    return this.validators;
  }
}
