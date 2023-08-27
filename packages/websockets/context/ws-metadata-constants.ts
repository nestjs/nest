import { WsParamtype } from '../enums/ws-paramtype.enum';

export const DEFAULT_CALLBACK_METADATA = {
  [`${WsParamtype.MESSAGE}:2`]: { index: 2, data: undefined, pipes: [] },
  [`${WsParamtype.PAYLOAD}:1`]: { index: 1, data: undefined, pipes: [] },
  [`${WsParamtype.SOCKET}:0`]: { index: 0, data: undefined, pipes: [] },
};
