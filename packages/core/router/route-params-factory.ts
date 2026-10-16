import { RouteParamtypes } from '@nestjs/common/enums/route-paramtypes.enum';
import { isNil, isObject } from '@nestjs/common/utils/shared.utils';
import { IRouteParamsFactory } from './interfaces/route-params-factory.interface';

/**
 * A key picks a property of an object body. Of an array, a Buffer or a
 * primitive the client sent instead, it picks only an own property (an
 * element, a length), not a prototype member: `Buffer#parent` exposes memory
 * shared with other requests, and a built-in function such as
 * `Array.prototype.values` passes for a DTO without required properties.
 * Objects keep resolving inherited properties, as a custom body parser may
 * build class instances.
 */
const getBodyProperty = (body: unknown, key: string) =>
  (isObject(body) && !Array.isArray(body) && !ArrayBuffer.isView(body)) ||
  (!isNil(body) && Object.prototype.hasOwnProperty.call(Object(body), key))
    ? (body as Record<string, any>)[key]
    : undefined;

export class RouteParamsFactory implements IRouteParamsFactory {
  public exchangeKeyForValue<
    TRequest extends Record<string, any> = any,
    TResponse = any,
    TResult = any,
  >(
    key: RouteParamtypes | string,
    data: string,
    { req, res, next }: { req: TRequest; res: TResponse; next: Function },
  ): TResult | null {
    switch (key) {
      case RouteParamtypes.NEXT:
        return next as any;
      case RouteParamtypes.REQUEST:
        return req as any;
      case RouteParamtypes.RESPONSE:
        return res as any;
      case RouteParamtypes.BODY:
        return data && req.body ? getBodyProperty(req.body, data) : req.body;
      case RouteParamtypes.RAW_BODY:
        return req.rawBody;
      case RouteParamtypes.PARAM:
        return data ? req.params[data] : req.params;
      case RouteParamtypes.HOST:
        /* eslint-disable-next-line no-case-declarations */
        const hosts = req.hosts || {};
        return data ? hosts[data] : hosts;
      case RouteParamtypes.QUERY:
        return data ? req.query[data] : req.query;
      case RouteParamtypes.HEADERS:
        return data ? req.headers[data.toLowerCase()] : req.headers;
      case RouteParamtypes.SESSION:
        return req.session;
      case RouteParamtypes.FILE:
        return req[data || 'file'];
      case RouteParamtypes.FILES:
        return req.files;
      case RouteParamtypes.IP:
        return req.ip;
      default:
        return null;
    }
  }
}
