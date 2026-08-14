import type { StandardSchemaV1 } from '@standard-schema/spec';
import { uid } from 'uid';
import { ROUTE_ARGS_METADATA } from '../../constants.js';
import { PipeTransform } from '../../index.js';
import { CustomParamFactory } from '../../interfaces/features/custom-route-param-factory.interface.js';
import { Type } from '../../interfaces/index.js';
import { assignCustomParameterMetadata } from '../../utils/assign-custom-metadata.util.js';
import { isFunction, isNil } from '../../utils/shared.utils.js';
import { isParameterDecoratorOptions } from '../../utils/parameter-decorator-options.util.js';
import { ParameterDecoratorOptions } from './route-params.decorator.js';

export type ParamDecoratorEnhancer = ParameterDecorator;

/**
 * Defines route param decorator
 *
 * @param factory
 * @param enhancers
 *
 * @publicApi
 */
export function createParamDecorator<FactoryData = any, FactoryOutput = any>(
  factory: CustomParamFactory<FactoryData, FactoryOutput>,
  enhancers: ParamDecoratorEnhancer[] = [],
): (
  ...dataOrPipes: (
    | Type<PipeTransform>
    | PipeTransform
    | FactoryData
    | ParameterDecoratorOptions
  )[]
) => ParameterDecorator {
  const paramtype = uid(21);
  return (
      data?,
      ...pipes: (
        | Type<PipeTransform>
        | PipeTransform
        | FactoryData
        | ParameterDecoratorOptions
      )[]
    ): ParameterDecorator =>
    (target, key, index) => {
      const args =
        Reflect.getMetadata(ROUTE_ARGS_METADATA, target.constructor, key!) ||
        {};

      const isPipe = (pipe: any) =>
        pipe &&
        ((isFunction(pipe) &&
          pipe.prototype &&
          isFunction(pipe.prototype.transform)) ||
          isFunction(pipe.transform));

      const hasParamData = isNil(data) || !isPipe(data);
      const paramData = hasParamData ? (data as any) : undefined;
      const paramPipes = hasParamData ? pipes : [data, ...pipes];

      // Check if data itself is an options object (when used as the first argument)
      const isDataOptions =
        hasParamData && !isNil(data) && isParameterDecoratorOptions(data);

      // Check if the last pipe argument is actually an options object
      const lastPipeArg =
        paramPipes.length > 0 ? paramPipes[paramPipes.length - 1] : undefined;
      const isLastPipeOptions =
        !isDataOptions && isParameterDecoratorOptions(lastPipeArg);

      let finalData: any;
      let finalSchema: StandardSchemaV1 | undefined;
      let finalPipes: (Type<PipeTransform> | PipeTransform | FactoryData)[];

      if (isDataOptions) {
        const opts = data as unknown as ParameterDecoratorOptions;
        finalData = undefined;
        finalSchema = opts.schema;
        // Merge positional pipes passed after the options object
        finalPipes = [...((opts.pipes ?? []) as any[]), ...paramPipes];
      } else if (isLastPipeOptions) {
        const opts = lastPipeArg as unknown as ParameterDecoratorOptions;
        finalData = paramData;
        finalSchema = opts.schema;
        finalPipes = [
          ...paramPipes.slice(0, -1),
          ...((opts.pipes ?? []) as any[]),
        ];
      } else {
        finalData = paramData;
        finalSchema = undefined;
        finalPipes = paramPipes as (
          | Type<PipeTransform>
          | PipeTransform
          | FactoryData
        )[];
      }

      Reflect.defineMetadata(
        ROUTE_ARGS_METADATA,
        assignCustomParameterMetadata(
          args,
          paramtype,
          index,
          factory,
          finalData,
          finalSchema,
          ...(finalPipes as PipeTransform[]),
        ),
        target.constructor,
        key!,
      );
      enhancers.forEach(fn => fn(target, key, index));
    };
}
