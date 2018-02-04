import { BadRequestException } from '../exceptions/bad-request.exception';
import { PipeTransform } from '../interfaces/pipe-transform.interface';
import { Pipe, ArgumentMetadata } from '../index';

@Pipe()
export class ParseIntPipe implements PipeTransform<string> {
  public async transform(value: string, metadata: ArgumentMetadata) {
    if (value.trim().length === value.length) {
      const num = +value;

      if (Number.isInteger(num)) {
        return num;
      }
    }

    throw new BadRequestException('Validation failed');
  }
}
