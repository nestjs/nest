import { PipeTransform, Type } from '@nestjs/common';
import { WsParamtype } from '../enums/ws-paramtype.enum';
import { createPipesWsParamDecorator } from '../utils/param.utils';

export function MessageBody(): ParameterDecorator;
export function MessageBody(
  ...pipes: (Type<PipeTransform> | PipeTransform)[]
): ParameterDecorator;
export function MessageBody(
  ...pipes: (Type<PipeTransform> | PipeTransform)[]
): ParameterDecorator {
  return createPipesWsParamDecorator(WsParamtype.PAYLOAD)(...pipes);
}
