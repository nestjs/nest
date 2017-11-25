import { RouteParamtypes } from '@nestjs/common/enums/route-paramtypes.enum';
export interface IRouteParamsFactory {
    exchangeKeyForValue(key: RouteParamtypes, data: any, {req, res, next}: {
        req: any;
        res: any;
        next: any;
    }): any;
}
