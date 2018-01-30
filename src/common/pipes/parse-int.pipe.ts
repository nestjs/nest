import { BadRequestException } from '../exceptions/bad-request.exception';
import { PipeTransform } from '../interfaces/pipe-transform.interface';
import { Pipe, ArgumentMetadata } from '../index';
import {isNumeric} from "rxjs/util/isNumeric";

@Pipe()
export class ParseIntPipe implements PipeTransform<string> {
  async transform(value: string, metadata: ArgumentMetadata): Promise<number> {
    if ('string' === typeof value && isNumeric(value)) {
     return parseInt(value, 10);
    }
    else {
      throw new BadRequestException('Numeric string is expected');
    }
  }
}