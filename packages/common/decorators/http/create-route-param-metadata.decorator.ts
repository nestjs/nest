import * as deprecate from 'deprecate';
import { CUSTOM_ROUTE_AGRS_METADATA, ROUTE_ARGS_METADATA } from '../../constants';
import { PipeTransform } from '../../index';
import { Type } from '../../interfaces';
import { CustomParamFactory } from '../../interfaces/features/custom-route-param-factory.interface';
import { isNil, isString } from '../../utils/shared.utils';
import { ParamData, RouteParamsMetadata } from './route-params.decorator';

const assignCustomMetadata = (
  args: RouteParamsMetadata,
  paramtype: number | string,
  index: number,
  factory: CustomParamFactory,
  data?: ParamData,
  ...pipes: (Type<PipeTransform> | PipeTransform)[],
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

/*
 * Defines HTTP route param decorator
 * @param factory
 */
export function createParamDecorator(
  factory: CustomParamFactory,
): (...dataOrPipes: (Type<PipeTransform> | PipeTransform | string)[]) => ParameterDecorator {
  const paramtype = randomString() + randomString();
  return (
    data?,
    ...pipes: (Type<PipeTransform> | PipeTransform)[],
  ): ParameterDecorator => (target, key, index) => {
    const args =
      Reflect.getMetadata(ROUTE_ARGS_METADATA, target.constructor, key) || {};

    const hasParamData = isNil(data) || isString(data);
    const paramData = hasParamData ? data : undefined;
    const paramPipes = hasParamData ? pipes : [data, ...pipes];

    Reflect.defineMetadata(
      ROUTE_ARGS_METADATA,
      assignCustomMetadata(
        args,
        paramtype,
        index,
        factory,
        paramData,
        ...paramPipes,
      ),
      target.constructor,
      key,
    );
  };
}

/**
 * Defines HTTP route param decorator
 * @deprecated
 * @param factory
 */
export function createRouteParamDecorator(
  factory: CustomParamFactory,
): (
  data?: any,
  ...pipes: (Type<PipeTransform> | PipeTransform)[],
) => ParameterDecorator {
  deprecate(
    'The "createRouteParamDecorator" function is deprecated and will be removed within next major release. Use "createParamDecorator" instead.',
  );
  return createParamDecorator(factory);
}
