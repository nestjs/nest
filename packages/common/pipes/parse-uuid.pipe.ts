import isUUID from '../utils/isUUID';
import { Optional } from '../decorators';
import { BadRequestException } from '../exceptions/bad-request.exception';
import { ArgumentMetadata, Injectable } from '../index';
import { PipeTransform } from '../interfaces/features/pipe-transform.interface';

@Injectable()
export class ParseUUIDPipe implements PipeTransform<string> {
  private readonly version: '3' | '4' | '5';

  constructor(@Optional() version?: '3' | '4' | '5') {
    this.version = version;
  }
  async transform(value: string, metadata: ArgumentMetadata): Promise<string> {
    if (!isUUID(value, this.version)) {
      throw new BadRequestException(
        `Validation failed (uuid v${this.version} is expected)`,
      );
    }
    return value;
  }
}
