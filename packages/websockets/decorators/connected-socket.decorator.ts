import { WsParamtype } from '../enums/ws-paramtype.enum';
import { createWsParamDecorator } from '../utils/param.utils';

export const ConnectedSocket: () => ParameterDecorator = createWsParamDecorator(
  WsParamtype.SOCKET,
);
