import { uid } from 'uid';
import { ROUTE_ARGS_METADATA } from '../../constants';
import { PipeTransform } from '../../index';
import { Type } from '../../interfaces';
import { CustomParamFactory } from '../../interfaces/features/custom-route-param-factory.interface';
import { assignCustomParameterMetadata } from '../../utils/assign-custom-metadata.util';
import { isFunction, isNil } from '../../utils/shared.utils';

export type ParamDecoratorEnhancer = ParameterDecorator;

/**
 * Defines HTTP route param decorator
 *
 * @param factory
 *
 * @publicApi
 */
export function createParamDecorator<
  FactoryData = any,
  FactoryInput = any,
  FactoryOutput = any,
>(
  factory: CustomParamFactory<FactoryData, FactoryInput, FactoryOutput>,
  enhancers: ParamDecoratorEnhancer[] = [],
): (
  ...dataOrPipes: (Type<PipeTransform> | PipeTransform | FactoryData)[]
) => ParameterDecorator {
  const paramtype = uid(21);
  return (
      data?,
      ...pipes: (Type<PipeTransform> | PipeTransform | FactoryData)[]
    ): ParameterDecorator =>
    (target, key, index) => {
      const args =
        Reflect.getMetadata(ROUTE_ARGS_METADATA, target.constructor, key) || {};

      const isPipe = (pipe: any) =>
        pipe &&
        ((isFunction(pipe) &&
          pipe.prototype &&
          isFunction(pipe.prototype.transform)) ||
          isFunction(pipe.transform));

      const hasParamData = isNil(data) || !isPipe(data);
      const paramData = hasParamData ? (data as any) : undefined;
      const paramPipes = hasParamData ? pipes : [data, ...pipes];

      Reflect.defineMetadata(
        ROUTE_ARGS_METADATA,
        assignCustomParameterMetadata(
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
