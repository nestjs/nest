import {Metatype} from '../metatype.interface';

import {RpcExceptionFilter} from './rpc-exception-filter.interface';

export interface RpcExceptionFilterMetadata {
  func: RpcExceptionFilter['catch'];
  exceptionMetatypes: Metatype<any>[];
}
