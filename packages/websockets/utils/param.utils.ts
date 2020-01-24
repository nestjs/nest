import { PipeTransform, Type } from '@nestjs/common';
import { assignMetadata } from '@nestjs/common/decorators/http/route-params.decorator';
import 'reflect-metadata';
import { PARAM_ARGS_METADATA } from '../constants';
import { WsParamtype } from '../enums/ws-paramtype.enum';

export function createWsParamDecorator(
  paramtype: WsParamtype,
): (...pipes: (Type<PipeTransform> | PipeTransform)[]) => ParameterDecorator {
  return (...pipes: (Type<PipeTransform> | PipeTransform)[]) => (
    target,
    key,
    index,
  ) => {
    const args =
      Reflect.getMetadata(PARAM_ARGS_METADATA, target.constructor, key) || {};
    Reflect.defineMetadata(
      PARAM_ARGS_METADATA,
      assignMetadata(args, paramtype, index, undefined, ...pipes),
      target.constructor,
      key,
    );
  };
}

export const createPipesWsParamDecorator = (paramtype: WsParamtype) => (
  ...pipes: (Type<PipeTransform> | PipeTransform)[]
): ParameterDecorator => (target, key, index) => {
  const args =
    Reflect.getMetadata(PARAM_ARGS_METADATA, target.constructor, key) || {};

  Reflect.defineMetadata(
    PARAM_ARGS_METADATA,
    assignMetadata(args, paramtype, index, undefined, ...pipes),
    target.constructor,
    key,
  );
};
