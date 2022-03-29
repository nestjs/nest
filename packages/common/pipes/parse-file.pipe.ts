import { Injectable, Optional } from '../decorators/core';
import { HttpStatus } from '../enums';
import {
  ErrorHttpStatusCode,
  HttpErrorByCode,
} from '../utils/http-error-by-code.util';
import {
  ArgumentMetadata,
  PipeTransform,
} from '../interfaces/features/pipe-transform.interface';

export interface FileValidationOptions {
  fileType?: string;
  maxFileSize?: number;
}

export interface ParseFileOptions {
  fileType?: string;
  maxFileSize?: number;
  errorHttpStatusCode?: ErrorHttpStatusCode;
  exceptionFactory?: (error: string) => any;
}

@Injectable()
export class ParseFile implements PipeTransform<any> {
  protected exceptionFactory: (error: string) => any;
  protected validationOptions: FileValidationOptions;

  constructor(@Optional() options?: ParseFileOptions = {} ) {
    const {
      exceptionFactory,
      errorHttpStatusCode = HttpStatus.BAD_REQUEST,
      fileType,
      maxFileSize,
    } = options;

    this.validationOptions = {
      maxFileSize: maxFileSize,
      fileType: fileType,
    };

    this.exceptionFactory =
      exceptionFactory ||
      (error => new HttpErrorByCode[errorHttpStatusCode](error));
  }

  async transform(value: any, metadata: ArgumentMetadata): Promise<any> {
    if (this.validationOptions) {
      this.validate(value, this.validationOptions);
    }
    return value;
  }

  protected validate(
    object: any,
    validationOptions: FileValidationOptions,
  ): any {
    if (
      validationOptions.maxFileSize &&
      validationOptions.maxFileSize < object.size
    ) {
      throw this.exceptionFactory(
        `Validation failed (expected size is less ${validationOptions.maxFileSize})`,
      );
    }
    if (
      validationOptions.fileType &&
      validationOptions.fileType !== object.mimetype
    ) {
      throw this.exceptionFactory(
        `Validation failed (expected file type is ${validationOptions.fileType})`,
      );
    }
    return object;
  }
}
