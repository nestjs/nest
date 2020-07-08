import { ArgumentMetadata, Injectable, PipeTransform } from '../index';
import { isNil } from '../utils/shared.utils';

/**
 * Defines the built-in DefaultValue Pipe
 *
 * @see [Built-in Pipes](https://docs.nestjs.com/pipes#built-in-pipes)
 *
 * @publicApi
 */
@Injectable()
export class DefaultValuePipe<T = any, R = any>
  implements PipeTransform<T, T | R> {
  constructor(private readonly defaultValue: R) {}

  transform(value?: T, _metadata?: ArgumentMetadata): T | R {
    if (
      isNil(value) ||
      (typeof value === 'number' && isNaN((value as unknown) as number))
    ) {
      return this.defaultValue;
    }
    return value;
  }
}
