import { ErrorHttpStatusCode } from '../../utils/http-error-by-code.util';
import { FileValidator } from './file-validator.interface';

export interface ParseFileOptions {
  validators?: FileValidator[];
  errorHttpStatusCode?: ErrorHttpStatusCode;
  exceptionFactory?: (error: string) => any;
}
