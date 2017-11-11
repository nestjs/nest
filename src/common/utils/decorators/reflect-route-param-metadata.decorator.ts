import { ROUTE_ARGS_METADATA, CUSTOM_ROUTE_AGRS_METADATA } from '../../constants';
import { ICustomParamReflector, CustomParamReflector } from '../../interfaces/custom-route-param-reflector.interface';
import { RouteParamsMetadata, ParamData } from './route-params.decorator';

const assignCustomMetadata = (
  args: RouteParamsMetadata,
  paramtype: number|string,
  index: number,
  data?: ParamData,
) => ({
  ...args,
  [`${paramtype}${CUSTOM_ROUTE_AGRS_METADATA}:${index}`]: {
    index,
    data,
  },
});

/**
 * Create route params custom decorator
 * @param paramtype 
 * @param handler 
 */
export const ReflectRouteParamDecorator = (
  paramtype: number|string,
  reflector: CustomParamReflector,
): [
  (data?: ParamData) => ParameterDecorator,
  ICustomParamReflector
] => {
  const decorator = (data?: ParamData): ParameterDecorator => (target, key, index) => {
    const args = Reflect.getMetadata(ROUTE_ARGS_METADATA, target, key) || {};
    Reflect.defineMetadata(
      ROUTE_ARGS_METADATA,
      assignCustomMetadata(args, paramtype, index, data),
      target,
      key,
    );
  };

  return [
    decorator,
    {
      paramtype: `${paramtype}${CUSTOM_ROUTE_AGRS_METADATA}`,
      reflector,
    },
  ]
};
