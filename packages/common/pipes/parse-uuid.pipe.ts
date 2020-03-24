import { Optional } from '../decorators';
import {
  ArgumentMetadata,
  HttpException,
  HttpStatus,
  Injectable,
} from '../index';
import { PipeTransform } from '../interfaces/features/pipe-transform.interface';
import { isUUID } from '../utils/is-uuid';

export interface ParseUUIDPipeOptions {
  version?: '3' | '4' | '5';
  exceptionCode?: HttpStatus;
  exceptionFactory?: (errors: string) => any;
}

@Injectable()
export class ParseUUIDPipe implements PipeTransform<string> {
  private readonly version: '3' | '4' | '5';
  protected exceptionFactory: (errors: string) => any;

  constructor(@Optional() options?: ParseUUIDPipeOptions) {
    options = options || {};
    const {
      exceptionFactory,
      exceptionCode = HttpStatus.BAD_REQUEST,
      version,
    } = options;

    this.version = version;
    this.exceptionFactory =
      exceptionFactory ||
      (error => HttpException.createException(error, exceptionCode));
  }
  async transform(value: string, metadata: ArgumentMetadata): Promise<string> {
    if (!isUUID(value, this.version)) {
      throw this.exceptionFactory(
        `Validation failed (uuid ${
          this.version ? 'v' + this.version : ''
        } is expected)`,
      );
    }
    return value;
  }
}
