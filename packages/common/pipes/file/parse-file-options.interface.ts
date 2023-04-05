import { ErrorHttpStatusCode } from '../../utils/http-error-by-code.util';
import { FileValidator } from './file-validator.interface';

/**
 * @publicApi
 */
export interface ParseFileOptions {
  validators?: FileValidator[];
  errorHttpStatusCode?: ErrorHttpStatusCode;
  exceptionFactory?: (error: string) => any;

  /**
   * Defines if file parameter is required.
   * @default true
   */
  fileIsRequired?: boolean;
}
