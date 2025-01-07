import { HttpServer } from '@nestjs/common';
import { RequestMethod } from '@nestjs/common/enums/request-method.enum';

export const REQUEST_METHOD_MAP = {
  [RequestMethod.GET]: 'get',
  [RequestMethod.POST]: 'post',
  [RequestMethod.PUT]: 'put',
  [RequestMethod.DELETE]: 'delete',
  [RequestMethod.PATCH]: 'patch',
  [RequestMethod.ALL]: 'all',
  [RequestMethod.OPTIONS]: 'options',
  [RequestMethod.HEAD]: 'head',
  [RequestMethod.SEARCH]: 'search',
  [RequestMethod.PROPFIND]: 'propfind',
  [RequestMethod.PROPPATCH]: 'proppatch',
  [RequestMethod.MKCOL]: 'mkcol',
  [RequestMethod.COPY]: 'copy',
  [RequestMethod.MOVE]: 'move',
  [RequestMethod.LOCK]: 'lock',
  [RequestMethod.UNLOCK]: 'unlock',
} as const satisfies Record<RequestMethod, keyof HttpServer>;

export class RouterMethodFactory {
  public get(target: HttpServer, requestMethod: RequestMethod): Function {
    const methodName = REQUEST_METHOD_MAP[requestMethod];
    const method = target[methodName];
    if (!method) {
      return target.use;
    }
    return method;
  }
}
