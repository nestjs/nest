import { NextFunction, Request, Response } from 'express';

import { IRouteParamsFactory } from './interfaces/route-params-factory.interface';
import { RouteParamtypes } from '@nestjs/common/enums/route-paramtypes.enum';

export class RouteParamsFactory implements IRouteParamsFactory {
    public exchangeKeyForValue(
        key: RouteParamtypes | string, data: any,
        { req, res, next }: { req: Request & any; res: Response & any; next: NextFunction }
    ) {
        switch (key) {
            case RouteParamtypes.NEXT: return next;
            case RouteParamtypes.REQUEST: return req;
            case RouteParamtypes.RESPONSE: return res;
            case RouteParamtypes.BODY: return data && req.body ? req.body[data] : req.body;
            case RouteParamtypes.PARAM: return data ? req.params[data] : req.params;
            case RouteParamtypes.QUERY: return data ? req.query[data] : req.query;
            case RouteParamtypes.HEADERS: return data ? req.headers[data] : req.headers;
            case RouteParamtypes.SESSION: return req.session;
            default: return null;
        }
    }
}
