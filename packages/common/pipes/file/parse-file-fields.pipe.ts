import { Injectable } from '../../decorators/core';
import { PipeTransform } from '../../interfaces/features/pipe-transform.interface';
import { FileValidator } from './file-validator.interface';
import { ParseFilePipe } from './parse-file.pipe';
import { IFile } from './interfaces';
import { ParseFileFieldsOptions } from './parse-file-fields-options.interface';
import { ParseFileOptions } from './parse-file-options.interface';

type FileFields = Record<string, IFile[]>;

/**
 * Defines the built-in ParseFileFields Pipe that can be used to validate multiple files.
 * It should only be used with the `@UploadedFiles()` decorator, `FileFieldsInterceptor`,
 * and `AnyFilesInterceptor` interceptors. When files are extracted with the
 * `AnyFilesInterceptor`, this pipe should be associated with the GroupFiles Pipe.
 *
 * @see [Built-in Pipes](https://docs.nestjs.com/pipes#built-in-pipes)
 *
 * @publicApi
 */
@Injectable()
export class ParseFileFieldsPipe
  implements PipeTransform<FileFields, Promise<FileFields>>
{
  private pipesMap = new Map<string, ParseFilePipe>();

  constructor(private readonly options: ParseFileFieldsOptions) {}

  async transform(value: FileFields): Promise<FileFields> {
    const { fields, commonOptions } = this.options;
    const promises: Promise<any>[] = [];

    for (const { name, options } of fields) {
      let pipe = this.pipesMap.get(name);

      if (!pipe) {
        const mergedOptions = options
          ? this.mergeWithCommonOptions(options)
          : commonOptions;

        pipe = new ParseFilePipe(mergedOptions);
        this.pipesMap.set(name, pipe);
      }

      promises.push(pipe.transform(value[name]));
    }

    const values = await Promise.all(promises);
    const output: FileFields = {};

    for (let i = 0; i < fields.length; ++i) {
      output[fields[i].name] = values[i];
    }

    return output;
  }

  public mergeWithCommonOptions(options: ParseFileOptions): ParseFileOptions {
    const {
      fileIsRequired,
      validators,
      errorHttpStatusCode,
      exceptionFactory,
    } = options;
    const { commonOptions } = this.options;
    const commonValidators: FileValidator[] = commonOptions?.validators ?? [];

    return {
      fileIsRequired: fileIsRequired ?? commonOptions?.fileIsRequired ?? true,
      errorHttpStatusCode:
        errorHttpStatusCode ?? commonOptions?.errorHttpStatusCode,
      validators: commonValidators.concat(validators ?? []),
      exceptionFactory: exceptionFactory ?? commonOptions?.exceptionFactory,
    };
  }
}
