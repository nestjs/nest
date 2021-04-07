import { Type } from '../type.interface';

import { RpcExceptionFilter } from './rpc-exception-filter.interface';

export interface RpcExceptionFilterMetadata {
  func: RpcExceptionFilter['catch'];
  exceptionMetatypes: Type<any>[];
}
