import { ExceptionFilter } from './exception-filter.interface';
import { Metatype } from '../metatype.interface';
export interface ExceptionFilterMetadata {
  func: ExceptionFilter['catch'];
  exceptionMetatypes: Metatype<any>[];
}
