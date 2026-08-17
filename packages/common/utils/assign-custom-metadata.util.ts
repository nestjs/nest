import type { StandardSchemaV1 } from '@standard-schema/spec';
import { CUSTOM_ROUTE_ARGS_METADATA } from '../constants.js';
import {
  ParamData,
  RouteParamMetadata,
} from '../decorators/http/route-params.decorator.js';
import { CustomParamFactory } from '../interfaces/features/custom-route-param-factory.interface.js';
import { PipeTransform, Type } from '../interfaces/index.js';

export function assignCustomParameterMetadata(
  args: Record<number, RouteParamMetadata>,
  paramtype: number | string,
  index: number,
  factory: CustomParamFactory,
  data?: ParamData,
  schema?: StandardSchemaV1,
  ...pipes: (Type<PipeTransform> | PipeTransform)[]
) {
  return {
    ...args,
    [`${paramtype}${CUSTOM_ROUTE_ARGS_METADATA}:${index}`]: {
      index,
      factory,
      data,
      pipes,
      ...(schema !== undefined && { schema }),
    },
  };
}
