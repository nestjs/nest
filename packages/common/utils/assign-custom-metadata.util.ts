import { CUSTOM_ROUTE_ARGS_METADATA } from '../constants.js';
import {
  ParamData,
  RouteParamMetadata,
} from '../decorators/http/route-params.decorator.js';
import { PipeTransform, Type } from '../interfaces/index.js';
import { CustomParamFactory } from '../interfaces/features/custom-route-param-factory.interface.js';

export function assignCustomParameterMetadata(
  args: Record<number, RouteParamMetadata>,
  paramtype: number | string,
  index: number,
  factory: CustomParamFactory,
  data?: ParamData,
  ...pipes: (Type<PipeTransform> | PipeTransform)[]
) {
  return {
    ...args,
    [`${paramtype}${CUSTOM_ROUTE_ARGS_METADATA}:${index}`]: {
      index,
      factory,
      data,
      pipes,
    },
  };
}
