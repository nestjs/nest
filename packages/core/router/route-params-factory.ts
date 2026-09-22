import { IRouteParamsFactory } from './interfaces/route-params-factory.interface.js';
import { RouteParamtypes } from '@nestjs/common/internal';
import type { ApplicationConfig } from '../application-config.js';
import {
  getRequestCookie,
  getRequestCookies,
  getRequestSignedCookie,
  getRequestSignedCookies,
} from '../helpers/cookies/request-cookies.js';

export class RouteParamsFactory implements IRouteParamsFactory {
  constructor(private readonly config?: ApplicationConfig) {}

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
        return data && req.body ? req.body[data] : req.body;
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
      case RouteParamtypes.COOKIES:
        return (
          data ? getRequestCookie(req, data) : getRequestCookies(req)
        ) as any;
      case RouteParamtypes.SIGNED_COOKIES: {
        const signer = this.config?.getCookieSigner();
        return (
          data
            ? getRequestSignedCookie(req, data, signer)
            : getRequestSignedCookies(req, signer)
        ) as any;
      }
      default:
        return null;
    }
  }
}
