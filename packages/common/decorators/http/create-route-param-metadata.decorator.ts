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

      // Custom data may also contain schema or pipes properties, so only treat
      // the first argument as options when those are its only keys and their
      // values, if defined, are a Standard Schema and an array of pipes.
      const isDataOptions =
        hasParamData &&
        !isNil(data) &&
        isParameterDecoratorOptions(data) &&
        Object.keys(data).every(key => key === 'schema' || key === 'pipes') &&
        (data.schema === undefined ||
          isFunction(data.schema?.['~standard']?.validate)) &&
        (data.pipes === undefined ||
          (Array.isArray(data.pipes) &&
            // Falsy entries are allowed, as the pipes context filters them out
            data.pipes.every(pipe => isNil(pipe) || isPipe(pipe))));

      const finalData: any = isDataOptions ? undefined : paramData;
      let finalSchema: StandardSchemaV1 | undefined;
      const finalPipes: (Type<PipeTransform> | PipeTransform)[] = [];

      // Options objects may also appear among the pipes, at any position.
      // Their pipes are merged in place, and the first schema found is used.
      for (const arg of isDataOptions ? [data, ...paramPipes] : paramPipes) {
        if (isParameterDecoratorOptions(arg)) {
          finalSchema ??= arg.schema;
          finalPipes.push(...(arg.pipes ?? []));
        } else {
          finalPipes.push(arg as Type<PipeTransform> | PipeTransform);
        }
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
          ...finalPipes,
        ),
        target.constructor,
        key!,
      );
      enhancers.forEach(fn => fn(target, key, index));
    };
}
