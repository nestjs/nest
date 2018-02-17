import {
  ROUTE_ARGS_METADATA,
  CUSTOM_ROUTE_AGRS_METADATA,
} from '../../constants';
import { CustomParamFactory } from '../../interfaces/features/custom-route-param-factory.interface';
import { RouteParamsMetadata, ParamData } from './route-params.decorator';
import { PipeTransform } from '../../index';
import { isNil, isString } from '../../utils/shared.utils';

const assignCustomMetadata = (
  args: RouteParamsMetadata,
  paramtype: number | string,
  index: number,
  factory: CustomParamFactory,
  data?: ParamData,
  ...pipes: PipeTransform<any>[]
) => ({
  ...args,
  [`${paramtype}${CUSTOM_ROUTE_AGRS_METADATA}:${index}`]: {
    index,
    factory,
    data,
    pipes,
  },
});

const randomString = () =>
  Math.random()
    .toString(36)
    .substring(2, 15);

/**
 * Create route params custom decorator
 * @param factory
 */
export function createRouteParamDecorator(
  factory: CustomParamFactory,
): (data?: any, ...pipes: PipeTransform<any>[]) => ParameterDecorator {
  const paramtype = randomString() + randomString();
  return (data?, ...pipes: PipeTransform<any>[]): ParameterDecorator => (
    target,
    key,
    index,
  ) => {
    const args = Reflect.getMetadata(ROUTE_ARGS_METADATA, target, key) || {};
    Reflect.defineMetadata(
      ROUTE_ARGS_METADATA,
      assignCustomMetadata(args, paramtype, index, factory, data, ...pipes),
      target,
      key,
    );
  };
}
