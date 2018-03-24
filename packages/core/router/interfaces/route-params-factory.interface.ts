import { RouteParamtypes } from '@nestjs/common/enums/route-paramtypes.enum';

export interface IRouteParamsFactory {
  exchangeKeyForValue(key: RouteParamtypes | string, data, { req, res, next });
}
