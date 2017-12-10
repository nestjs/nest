import { NextFunction, Request, Response } from 'express';

import { RouteParamtypes } from '@nestjs/common/enums/route-paramtypes.enum';
export interface IRouteParamsFactory {
    exchangeKeyForValue(
        key: RouteParamtypes | string, data: any,
        { req, res, next }: { req: Request & any; res: Response & any; next: NextFunction }): any;
}
