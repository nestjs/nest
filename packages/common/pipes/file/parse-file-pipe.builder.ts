import { FileTypeValidator } from './file-type.validator';
import { MagicFileTypeValidator } from './magic-file-type.validator';
import { FileValidator } from './file-validator.interface';
import {
  MaxFileSizeValidator,
  MaxFileSizeValidatorOptions,
} from './max-file-size.validator';
import { ParseFileOptions } from './parse-file-options.interface';
import { ParseFilePipe } from './parse-file.pipe';
import { FileTypeValidatorOptions } from './interfaces';

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

  addMagicFileTypeValidator(options: FileTypeValidatorOptions) {
    return this.addValidator(new MagicFileTypeValidator(options));
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
