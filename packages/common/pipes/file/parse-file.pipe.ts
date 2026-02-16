import { Injectable, Optional } from '../../decorators/core/index.js';
import { HttpStatus } from '../../enums/index.js';
import { PipeTransform } from '../../interfaces/features/pipe-transform.interface.js';
import { HttpErrorByCode } from '../../utils/http-error-by-code.util.js';
import { isEmpty, isObject, isUndefined } from '../../utils/shared.utils.js';
import { FileValidator } from './file-validator.interface.js';
import { ParseFileOptions } from './parse-file-options.interface.js';

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
export class ParseFilePipe implements PipeTransform {
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

  async transform(value: unknown): Promise<any> {
    const areThereAnyFilesIn = this.thereAreNoFilesIn(value);

    if (areThereAnyFilesIn && this.fileIsRequired) {
      throw this.exceptionFactory('File is required');
    }
    if (!areThereAnyFilesIn && this.validators.length) {
      await this.validateFilesOrFile(value);
    }

    return value;
  }

  private async validateFilesOrFile(value: unknown): Promise<void> {
    if (Array.isArray(value)) {
      await Promise.all(value.map(f => this.validate(f)));
    } else {
      await this.validate(value);
    }
  }

  private thereAreNoFilesIn(value: unknown): boolean {
    const isEmptyArray = Array.isArray(value) && isEmpty(value);
    const isEmptyObject = isObject(value) && isEmpty(Object.keys(value));
    return isUndefined(value) || isEmptyArray || isEmptyObject;
  }

  protected async validate(file: unknown): Promise<any> {
    for (const validator of this.validators) {
      await this.validateOrThrow(file, validator);
    }
    return file;
  }

  private async validateOrThrow(file: unknown, validator: FileValidator) {
    const isValid = await validator.isValid(file as any);

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
