import { ArgumentMetadata, Injectable, Optional } from '../index';
import { Type } from '../interfaces';
import { PipeTransform } from '../interfaces/features/pipe-transform.interface';
import { ValidationPipe, ValidationPipeOptions } from './validation.pipe';

export interface ParseArrayOptions
  extends Omit<
    ValidationPipeOptions,
    'transform' | 'validateCustomDecorators'
  > {
  items?: Type<unknown>;
  separator?: string;
  optional?: boolean;
}

/**
 * Defines the built-in ParseArray Pipe
 *
 * @see [Built-in Pipes](https://docs.nestjs.com/pipes#built-in-pipes)
 *
 * @publicApi
 */
@Injectable()
export class ParseArrayPipe implements PipeTransform {
  protected readonly validationPipe: ValidationPipe;

  constructor(@Optional() private readonly options: ParseArrayOptions = {}) {
    this.validationPipe = new ValidationPipe(options);
  }

  /**
   * Method that accesses and performs optional transformation on argument for
   * in-flight requests.
   *
   * @param value currently processed route argument
   * @param metadata contains metadata about the currently processed route argument
   */
  async transform(value: any, metadata: ArgumentMetadata): Promise<any> {
    if (!Array.isArray(value)) {
      // parse to array or fail
    }
    if (this.options.items) {
      // transform and validate items type
      value as any;
    }
  }
}
