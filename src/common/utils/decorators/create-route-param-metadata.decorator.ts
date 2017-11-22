import { ROUTE_ARGS_METADATA, CUSTOM_ROUTE_AGRS_METADATA } from '../../constants';
import { CustomParamFactory } from '../../interfaces/custom-route-param-factory.interface';
import { RouteParamsMetadata, ParamData } from './route-params.decorator';

const assignCustomMetadata = (
  args: RouteParamsMetadata,
  paramtype: number|string,
  index: number,
  factory: CustomParamFactory,
  data?: ParamData,
) => ({
  ...args,
  [`${index}:${paramtype}${CUSTOM_ROUTE_AGRS_METADATA}:${index}`]: {
    index,
    factory,
    data,
  },
});

const randomString = () => Math.random().toString(36).substring(2, 15);

/**
 * Create route params custom decorator
 * @param factory 
 */
export const createRouteParamDecorator = (factory: CustomParamFactory) => {
  const paramtype = randomString() + randomString();
  return (data?: ParamData): ParameterDecorator => (target, key, index) => {
    const args = Reflect.getMetadata(ROUTE_ARGS_METADATA, target, key) || {};
    Reflect.defineMetadata(
      ROUTE_ARGS_METADATA,
      assignCustomMetadata(args, paramtype, index, factory, data),
      target,
      key,
    );
  };
};
