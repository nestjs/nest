import { BadRequestException } from '../exceptions/bad-request.exception';
import { PipeTransform } from '../interfaces/pipe-transform.interface';
import { ArgumentMetadata, Pipe } from '../index';

@Pipe()
export class ParseIntPipe implements PipeTransform<string> {
  async transform(value: string, metadata: ArgumentMetadata): Promise<number> {
    const isNumeric =
      'string' === typeof value &&
      !isNaN(parseFloat(value)) &&
      isFinite(value as any);
    if (!isNumeric) {
      throw new BadRequestException('Numeric string is expected');
    }
    return parseInt(value, 10);
  }
}
