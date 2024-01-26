import { HttpServer } from '@nestjs/common';
import { RequestMethod } from '@nestjs/common/enums/request-method.enum';

/**
 * Ensures (via satisfies) there's a mapping between the RequestMethod enum and the HttpServer interface.
 * @note This is a compile-time check, so if the interface changes, the compiler will complain.
 * This is to resolve a case where a new RequestMethod is added, but the RouterMethodFactory is not updated.
 */
const RequestMethodMap = {
  [RequestMethod.GET]: 'get',
  [RequestMethod.POST]: 'post',
  [RequestMethod.PUT]: 'put',
  [RequestMethod.DELETE]: 'delete',
  [RequestMethod.PATCH]: 'patch',
  [RequestMethod.ALL]: 'all',
  [RequestMethod.OPTIONS]: 'options',
  [RequestMethod.HEAD]: 'head',
  [RequestMethod.SEARCH]: 'search',
} as const satisfies Record<RequestMethod, keyof HttpServer>;

export class RouterMethodFactory {
  public get(target: HttpServer, requestMethod: RequestMethod): Function {
    const methodName = RequestMethodMap[requestMethod];
    const method = target[methodName];
    if (!method) {
      // There should probably be a warning message in this case
      return target.use;
    }
    return method;
  }
}
