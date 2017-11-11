export interface IRouteCustomParamsFactory {
  exchangeKeyForValue(paramtype: number|string, data, { req, res, next });
}