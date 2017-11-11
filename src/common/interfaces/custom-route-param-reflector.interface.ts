export type CustomParamReflector = (data, req, res, next) => any;

export interface ICustomParamReflector {
  paramtype: number|string,
  reflector: CustomParamReflector;
}