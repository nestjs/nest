import { Injectable, Optional } from '../../decorators/core';
import { HttpStatus } from '../../enums';
import { HttpErrorByCode } from '../../utils/http-error-by-code.util';
import { PipeTransform } from '../../interfaces/features/pipe-transform.interface';
import { ParseFileOptions } from './parse-file-options.interface';
import { FileValidator } from './file-validator.interface';

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

  constructor(@Optional() options: ParseFileOptions = {}) {
    const {
      exceptionFactory,
      errorHttpStatusCode = HttpStatus.BAD_REQUEST,
      validators = [],
    } = options;

    this.exceptionFactory =
      exceptionFactory ||
      (error => new HttpErrorByCode[errorHttpStatusCode](error));

    this.validators = validators;
  }

  async transform(value: any): Promise<any> {
    if (this.validators.length) {
      await this.validate(value);
    }
    return value;
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
