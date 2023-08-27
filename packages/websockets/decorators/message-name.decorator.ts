import { WsParamtype } from '../enums/ws-paramtype.enum';
import { createWsParamDecorator } from '../utils/param.utils';

/**
 * @publicApi
 */
export const MessageName: () => ParameterDecorator = createWsParamDecorator(
  WsParamtype.MESSAGE,
);
