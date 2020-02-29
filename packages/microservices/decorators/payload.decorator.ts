import { PipeTransform, Type } from '@nestjs/common';
import { RpcParamtype } from '../enums/rpc-paramtype.enum';
import { createPipesRpcParamDecorator } from '../utils/param.utils';

export function Payload(): ParameterDecorator;
export function Payload(
  ...pipes: (Type<PipeTransform> | PipeTransform)[]
): ParameterDecorator;
export function Payload(
  ...pipes: (Type<PipeTransform> | PipeTransform)[]
): ParameterDecorator {
  return createPipesRpcParamDecorator(RpcParamtype.PAYLOAD)(...pipes);
}
