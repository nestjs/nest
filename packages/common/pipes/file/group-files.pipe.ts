import { Injectable } from '../../decorators/core';
import { PipeTransform } from '../../interfaces/features/pipe-transform.interface';

interface FileField {
  fieldname: string;
}

/**
 * Defines the built-in GroupFiles Pipe. This pipe can be used to group incoming files
 * by `fieldname`, before validation. It should only be used with `AnyFilesInterceptor()`
 * and the `@UploadedFiles()` decorator.
 *
 * @see [Built-in Pipes](https://docs.nestjs.com/pipes#built-in-pipes)
 *
 * @publicApi
 */
@Injectable()
export class GroupFilesPipe implements PipeTransform<any> {
  transform(value: any) {
    if (!Array.isArray(value)) {
      return value;
    }

    const result: Record<string, FileField[]> = {};

    for (const file of value) {
      if (!('fieldname' in file) || typeof file.fieldname !== 'string') {
        return value;
      }

      let group = result[file.fieldname];

      if (!group) {
        group = [];
        result[file.fieldname] = group;
      }
      group.push(file);
    }

    return result;
  }
}
