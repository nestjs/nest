import { ExceptionFilter } from './exception-filter.interface.js';
import { Type } from '../type.interface.js';

export interface ExceptionFilterMetadata {
  func: ExceptionFilter['catch'];
  exceptionMetatypes: Type<any>[];
}
