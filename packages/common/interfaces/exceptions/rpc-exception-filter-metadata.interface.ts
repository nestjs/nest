import { RpcExceptionFilter } from './rpc-exception-filter.interface.js';
import { Type } from '../type.interface.js';

export interface RpcExceptionFilterMetadata {
  func: RpcExceptionFilter['catch'];
  exceptionMetatypes: Type<any>[];
}
