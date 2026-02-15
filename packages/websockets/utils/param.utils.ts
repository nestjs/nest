import type {
  ParameterDecoratorOptions,
  PipeTransform,
  Type,
} from '@nestjs/common';
import { assignMetadata } from '@nestjs/common';
import { isNil, isString } from '@nestjs/common/internal';
import 'reflect-metadata';
import { PARAM_ARGS_METADATA } from '../constants.js';
import { WsParamtype } from '../enums/ws-paramtype.enum.js';

export function createWsParamDecorator(
  paramtype: WsParamtype,
): (...pipes: (Type<PipeTransform> | PipeTransform)[]) => ParameterDecorator {
  return (...pipes: (Type<PipeTransform> | PipeTransform)[]) =>
    (target, key, index) => {
      const args =
        Reflect.getMetadata(PARAM_ARGS_METADATA, target.constructor, key!) ||
        {};
      Reflect.defineMetadata(
        PARAM_ARGS_METADATA,
        assignMetadata(args, paramtype, index, { pipes }),
        target.constructor,
        key!,
      );
    };
}

export const createPipesWsParamDecorator =
  (paramtype: WsParamtype) =>
  (
    data?: any,
    optionsOrPipe?:
      | ParameterDecoratorOptions
      | Type<PipeTransform>
      | PipeTransform,
    ...pipes: (Type<PipeTransform> | PipeTransform)[]
  ): ParameterDecorator =>
  (target, key, index) => {
    const args =
      Reflect.getMetadata(PARAM_ARGS_METADATA, target.constructor, key!) || {};

    const isDataOptions =
      data &&
      typeof data === 'object' &&
      !('transform' in data) &&
      ('schema' in data || 'pipes' in data);

    if (isDataOptions) {
      const opts = data as ParameterDecoratorOptions;
      Reflect.defineMetadata(
        PARAM_ARGS_METADATA,
        assignMetadata(args, paramtype, index, {
          pipes: opts.pipes ?? [],
          schema: opts.schema,
        }),
        target.constructor,
        key!,
      );
      return;
    }

    const hasParamData = isNil(data) || isString(data);
    const paramData = hasParamData ? data : undefined;

    const isOptions =
      optionsOrPipe &&
      typeof optionsOrPipe === 'object' &&
      ('schema' in optionsOrPipe || 'pipes' in optionsOrPipe);

    let paramPipes: (Type<PipeTransform> | PipeTransform)[];
    if (isOptions) {
      paramPipes = optionsOrPipe.pipes ?? [];
    } else if (hasParamData) {
      paramPipes = [optionsOrPipe, ...pipes].filter(Boolean) as (
        | Type<PipeTransform>
        | PipeTransform
      )[];
    } else {
      paramPipes = [data, optionsOrPipe, ...pipes].filter(Boolean) as (
        | Type<PipeTransform>
        | PipeTransform
      )[];
    }

    Reflect.defineMetadata(
      PARAM_ARGS_METADATA,
      assignMetadata(args, paramtype, index, {
        data: paramData!,
        pipes: paramPipes,
        schema: isOptions ? optionsOrPipe.schema : undefined,
      }),
      target.constructor,
      key!,
    );
  };
