import { isEmpty, isObject, isUndefined } from '../../utils/shared.utils';
import { Injectable, Optional } from '../../decorators/core';
import { HttpStatus } from '../../enums';
import { PipeTransform } from '../../interfaces/features/pipe-transform.interface';
import { HttpErrorByCode } from '../../utils/http-error-by-code.util';
import { FileValidator } from './file-validator.interface';
import { ParseFileOptions } from './parse-file-options.interface';

/**
 * Defines the built-in ParseFile Pipe. This pipe can be used to validate incoming files
 * with `@UploadedFile()` decorator. You can use either other specific built-in validators
 * or provide one of your own, simply implementing it through {@link FileValidator}
 * interface and adding it to ParseFilePipe's constructor.
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
    if (this.thereAreNoFilesIn(value)) {
      if (this.fileIsRequired) {
        throw this.exceptionFactory('File is required');
      }

      return value;
    }

    if (this.validators.length) {
      this.validateAllFrom(value);
    }
    return value;
  }

  protected async validate(file: any): Promise<any> {
    for (const validator of this.validators) {
      await this.validateOrThrow(file, validator);
    }

    return file;
  }

  private async validateAllFrom(value: any) {
    if (Array.isArray(value)) {
      await this.validateFiles(value);
    } else if (isObject(value)) {
      const files = [].concat(...Object.values(value));
      await this.validateFiles(files);
    } else {
      await this.validate(value);
    }
  }

  private validateFiles(files: any[]): Promise<any[]> {
    return Promise.all(files.map(f => this.validate(f)));
  } 

  private async validateOrThrow(file: any, validator: FileValidator) {
    const isValid = await validator.isValid(file);

    if (!isValid) {
      const errorMessage = validator.buildErrorMessage(file);
      throw this.exceptionFactory(errorMessage);
    }
  }

  private thereAreNoFilesIn(value: any): boolean {
    const isEmptyArray = (Array.isArray(value) && isEmpty(value));
    const isEmptyObject = isObject(value) && isEmpty(Object.keys(value));
    return isUndefined(value) || isEmptyArray || isEmptyObject;
  }


  /**
   * @returns list of validators used in this pipe.
   */
  getValidators() {
    return this.validators;
  }
}
