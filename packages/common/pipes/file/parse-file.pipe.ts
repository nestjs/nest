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
      this.validate(value);
    }
    return value;
  }

  protected validate(file: any): any {
    const failingValidator = this.validators.find(
      validator => !validator.isValid(file),
    );

    if (failingValidator) {
      const errorMessage = failingValidator.buildErrorMessage(file);
      throw this.exceptionFactory(errorMessage);
    }
    return file;
  }

  /**
   * @returns list of validators used in this pipe.
   */
  getValidators() {
    return this.validators;
  }
}
