import {
  FileTypeValidator,
  FileTypeValidatorOptions,
} from './file-type.validator';
import { FileValidator } from './file-validator.interface';
import {
  MaxFileSizeValidator,
  MaxFileSizeValidatorOptions,
} from './max-file-size.validator';
import { ParseFileOptions } from './parse-file-options.interface';
import { ParseFilePipe } from './parse-file.pipe';

export class ParseFilePipeBuilder {
  private validators: FileValidator[] = [];

  addMaxSizeValidator(options: MaxFileSizeValidatorOptions) {
    this.validators.push(new MaxFileSizeValidator(options));
    return this;
  }

  addFileTypeValidator(options: FileTypeValidatorOptions) {
    this.validators.push(new FileTypeValidator(options));
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
