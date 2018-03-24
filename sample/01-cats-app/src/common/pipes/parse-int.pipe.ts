import { BadRequestException } from '@nestjs/common';
import {
  PipeTransform,
  Pipe,
  ArgumentMetadata,
  HttpStatus,
} from '@nestjs/common';

@Pipe()
export class ParseIntPipe implements PipeTransform<string> {
  async transform(value: string, metadata: ArgumentMetadata) {
    const val = parseInt(value, 10);
    if (isNaN(val)) {
      throw new BadRequestException('Validation failed');
    }
    return val;
  }
}
