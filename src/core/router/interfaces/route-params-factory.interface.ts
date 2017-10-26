import { RouteParamtypes } from '../../enums/route-paramtypes.enum';

export interface IRouteParamsFactory {
    exchangeKeyForValue(key: RouteParamtypes, data, { req, res, next });
}
