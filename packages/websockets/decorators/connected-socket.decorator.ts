import { WsParamtype } from '../enums/ws-paramtype.enum.js';
import { createWsParamDecorator } from '../utils/param.utils.js';

/**
 * @publicApi
 */
export const ConnectedSocket: () => ParameterDecorator = createWsParamDecorator(
  WsParamtype.SOCKET,
);
