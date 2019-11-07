import * as uuid from 'uuid/v4';
import {
  CUSTOM_ROUTE_AGRS_METADATA,
  ROUTE_ARGS_METADATA,
} from '../../constants';
import { PipeTransform } from '../../index';
import { Type } from '../../interfaces';
import { CustomParamFactory } from '../../interfaces';
import { isFunction, isNil } from '../../utils/shared.utils';
import { ParamData, RouteParamsMetadata } from './route-params.decorator';

const assignCustomMetadata = (
  args: RouteParamsMetadata,
  paramtype: number | string,
  index: number,
  factory: CustomParamFactory,
  data?: ParamData,
  ...pipes: (Type<PipeTransform> | PipeTransform)[]
) => ({
  ...args,
  [`${paramtype}${CUSTOM_ROUTE_AGRS_METADATA}:${index}`]: {
    index,
    factory,
    data,
    pipes,
  },
});

export type ParamDecoratorEnhancer = ParameterDecorator;

/**
 * Defines HTTP route param decorator
 *
 * @param factory
 * @param enhancers
 * @param pipeList A callback that accepts a list of all pipes that would be
 *     applied to the result, and returns
 *     a list of pipes to actually apply to the result.
 *     If not specified, all would be pipes are actually applied.
 */
export function createParamDecorator<
  TFactoryData = any,
  TFactoryRequest = any,
  TFactoryResult = any
>(
  factory: CustomParamFactory<TFactoryData, TFactoryRequest, TFactoryResult>,
  enhancers: ParamDecoratorEnhancer[] = [],
  pipeList?: (pipes?: (Type<PipeTransform> | PipeTransform)[]) => (Type<PipeTransform> | PipeTransform)[],
): (
  ...dataOrPipes: (Type<PipeTransform> | PipeTransform | any)[]
) => ParameterDecorator {
  const paramtype = uuid();
  return (
    data?,
    ...pipes: (Type<PipeTransform> | PipeTransform)[]
  ): ParameterDecorator => (target, key, index) => {
    const args =
      Reflect.getMetadata(ROUTE_ARGS_METADATA, target.constructor, key) || {};

    const isPipe = (pipe: any) =>
      pipe &&
      ((isFunction(pipe) &&
        pipe.prototype &&
        isFunction(pipe.prototype.transform)) ||
        isFunction(pipe.transform));

    const hasParamData = isNil(data) || !isPipe(data);
    const paramData = hasParamData ? data : undefined;
    const pipesToApply =
      typeof pipeList !== 'undefined' ? pipeList(pipes) : pipes;
    const paramPipes = hasParamData ? pipesToApply : [data, ...pipesToApply];

    Reflect.defineMetadata(
      ROUTE_ARGS_METADATA,
      assignCustomMetadata(
        args,
        paramtype,
        index,
        factory,
        paramData,
        ...(paramPipes as PipeTransform[]),
      ),
      target.constructor,
      key,
    );
    enhancers.forEach(fn => fn(target, key, index));
  };
}
