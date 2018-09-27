import { Inject, Injectable } from '@nest/core';

import { RouteParamtypes } from '../enums';
import { HTTP_SERVER } from '../tokens';

@Injectable()
export class RouteParamsFactory {
  public exchangeKeyForValue(
    key: keyof RouteParamtypes | string,
    data: string | object | any,
    { req, res, next },
  ) {
    switch (key) {
      case RouteParamtypes.NEXT:
        return next;
      case RouteParamtypes.REQUEST:
        return req;
      case RouteParamtypes.RESPONSE:
        return res;
      case RouteParamtypes.BODY:
        return data && req.body ? req.body[data] : req.body;
      case RouteParamtypes.PARAM:
        return data ? req.params[data] : req.params;
      case RouteParamtypes.QUERY:
        return data ? req.query[data] : req.query;
      case RouteParamtypes.HEADERS:
        return data ? req.headers[data] : req.headers;
      case RouteParamtypes.SESSION:
        return req.session;
      case RouteParamtypes.FILE:
        return req[data || 'file'];
      case RouteParamtypes.FILES:
        return req.files;
      default:
        return null;
    }
  }
}
