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

/**
 * @publicApi
 */
export class ParseFilePipeBuilder {
  private validators: FileValidator[] = [];

  addMaxSizeValidator(options: MaxFileSizeValidatorOptions) {
    return this.addValidator(new MaxFileSizeValidator(options));
  }

  addFileTypeValidator(options: FileTypeValidatorOptions) {
    const enhancedOptions = {
      ...options,
      mimeTypeFallback: true, // Enables fallback to file extension if mime-type is `application/octet-stream`
    };

    return this.addValidator(new FileTypeValidator(enhancedOptions));
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
