import {
  FileTypeValidator,
  FileTypeValidatorOptions,
} from './file-type.validator.js';
import { FileValidator } from './file-validator.interface.js';
import {
  MaxFileSizeValidator,
  MaxFileSizeValidatorOptions,
} from './max-file-size.validator.js';
import { ParseFileOptions } from './parse-file-options.interface.js';
import { ParseFilePipe } from './parse-file.pipe.js';

/**
 * @publicApi
 */
export class ParseFilePipeBuilder {
  private validators: FileValidator[] = [];

  addMaxSizeValidator(options: MaxFileSizeValidatorOptions) {
    return this.addValidator(new MaxFileSizeValidator(options));
  }

  addFileTypeValidator(options: FileTypeValidatorOptions) {
    return this.addValidator(new FileTypeValidator(options));
  }

  addValidator(validator: FileValidator) {
    this.validators.push(validator);
    return this;
  }

  build(
    additionalOptions?: Omit<ParseFileOptions, 'validators'>,
  ): ParseFilePipe {
    const parseFilePipe = new ParseFilePipe({
      ...additionalOptions,
      validators: this.validators,
    });

    this.validators = [];
    return parseFilePipe;
  }
}
