import { BadRequestException } from '../exceptions/bad-request.exception';
import { PipeTransform } from '../interfaces/pipe-transform.interface';
import { Pipe, ArgumentMetadata } from '../index';

@Pipe()
export class ParseIntPipe implements PipeTransform<string> {
  public async transform(value: string, metadata: ArgumentMetadata) {
    const val = +value;
    if (isNaN(val) || !Number.isInteger(val)) {
      throw new BadRequestException('Validation failed');
    }
    return val;
  }
}
