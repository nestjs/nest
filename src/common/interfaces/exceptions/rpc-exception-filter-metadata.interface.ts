import { RpcExceptionFilter } from './rpc-exception-filter.interface';
import { Metatype } from '../metatype.interface';

export interface RpcExceptionFilterMetadata {
  func: RpcExceptionFilter['catch'];
  exceptionMetatypes: Metatype<any>[];
}
