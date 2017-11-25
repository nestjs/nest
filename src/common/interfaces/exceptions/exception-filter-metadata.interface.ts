import {Metatype} from '../metatype.interface';

import {ExceptionFilter} from './exception-filter.interface';

export interface ExceptionFilterMetadata {
  func: ExceptionFilter['catch'];
  exceptionMetatypes: Metatype<any>[];
}
