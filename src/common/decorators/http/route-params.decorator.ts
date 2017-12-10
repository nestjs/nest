import 'reflect-metadata';

import { isNil, isString } from '../../utils/shared.utils';

import { PipeTransform } from '../../index';
import { ROUTE_ARGS_METADATA } from '../../constants';
import { RouteParamtypes } from '../../enums/route-paramtypes.enum';

export type ParamData = object | string | number;
export interface RouteParamsMetadata {
  [prop: number]: {
    index: number;
    data?: ParamData;
  };
}

const assignMetadata = (
  args: RouteParamsMetadata,
  paramtype: RouteParamtypes,
  index: number,
  data?: ParamData,
  ...pipes: PipeTransform<any>[],
) => ({
  ...args,
  [`${paramtype}:${index}`]: {
    index,
    data,
    pipes,
  },
});

const createRouteParamDecorator = (paramtype: RouteParamtypes) => {
  return (data?: ParamData): ParameterDecorator => (target, key, index) => {
    const args = Reflect.getMetadata(ROUTE_ARGS_METADATA, target, key) || {};
    Reflect.defineMetadata(
      ROUTE_ARGS_METADATA,
      assignMetadata(args, paramtype, index, data),
      target,
      key,
    );
  };
};

const createPipesRouteParamDecorator = (paramtype: RouteParamtypes) => (
  data?: any,
  ...pipes: PipeTransform<any>[],
): ParameterDecorator => (target, key, index) => {
  const args = Reflect.getMetadata(ROUTE_ARGS_METADATA, target, key) || {};
  const hasParamData = isNil(data) || isString(data);
  const paramData = hasParamData ? data : undefined;
  const paramPipes = hasParamData ? pipes : [data, ...pipes];

  Reflect.defineMetadata(
    ROUTE_ARGS_METADATA,
    assignMetadata(args, paramtype, index, paramData, ...paramPipes),
    target,
    key,
  );
};

export const Request: () => ParameterDecorator = createRouteParamDecorator(
  RouteParamtypes.REQUEST,
);
export const Response: () => ParameterDecorator = createRouteParamDecorator(
  RouteParamtypes.RESPONSE,
);
export const Next: () => ParameterDecorator = createRouteParamDecorator(
  RouteParamtypes.NEXT,
);
export const Session: () => ParameterDecorator = createRouteParamDecorator(
  RouteParamtypes.SESSION,
);
export const Headers: (
  property?: string,
) => ParameterDecorator = createRouteParamDecorator(RouteParamtypes.HEADERS);

export function Query(...pipes: PipeTransform<any>[]): ParameterDecorator;
export function Query(property: string, ...pipes: PipeTransform<any>[]): ParameterDecorator;
export function Query(
  property?: string | PipeTransform<any>,
  ...pipes: PipeTransform<any>[],
) {
  return createPipesRouteParamDecorator(RouteParamtypes.QUERY)(
    property,
    ...pipes,
  );
}

export function Body(...pipes: PipeTransform<any>[]): ParameterDecorator;
export function Body(property: string, ...pipes: PipeTransform<any>[]): ParameterDecorator;
export function Body(
  property?: string | PipeTransform<any>,
  ...pipes: PipeTransform<any>[],
) {
  return createPipesRouteParamDecorator(RouteParamtypes.BODY)(
    property,
    ...pipes,
  );
}

export function Param(...pipes: PipeTransform<any>[]): ParameterDecorator;
export function Param(property: string, ...pipes: PipeTransform<any>[]): ParameterDecorator;
export function Param(
  property?: string | PipeTransform<any>,
  ...pipes: PipeTransform<any>[],
) {
  return createPipesRouteParamDecorator(RouteParamtypes.PARAM)(
    property,
    ...pipes,
  );
}

export const Req = Request;
export const Res = Response;
