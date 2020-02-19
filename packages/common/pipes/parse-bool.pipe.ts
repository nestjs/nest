import { BadRequestException } from '../exceptions/bad-request.exception';
import { ArgumentMetadata, Injectable } from '../index';
import { PipeTransform } from '../interfaces/features/pipe-transform.interface';

/**
 * Defines the built-in ParseBool Pipe
 *
 * @see [Built-in Pipes](https://docs.nestjs.com/pipes#built-in-pipes)
 *
 * @publicApi
 */
@Injectable()
export class ParseBoolPipe
  implements PipeTransform<string | boolean, Promise<boolean>> {
  /**
   * Method that accesses and performs optional transformation on argument for
   * in-flight requests.
   *
   * @param value currently processed route argument
   * @param metadata contains metadata about the currently processed route argument
   */
  async transform(
    value: string | boolean,
    metadata: ArgumentMetadata,
  ): Promise<boolean> {
    if (value === true || value === 'true') {
      return true;
    }
    if (value === false || value === 'false') {
      return false;
    }
    throw new BadRequestException(
      'Validation failed (boolean string is expected)',
    );
  }
}
