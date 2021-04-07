import { Type } from '../type.interface';

import { ExceptionFilter } from './exception-filter.interface';

export interface ExceptionFilterMetadata {
  func: ExceptionFilter['catch'];
  exceptionMetatypes: Type<any>[];
}
