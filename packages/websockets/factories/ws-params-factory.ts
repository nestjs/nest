import { WS_PATH_PARAMS } from '../constants.js';
import { WsParamtype } from '../enums/ws-paramtype.enum.js';
import { isFunction } from '@nestjs/common/internal';

export class WsParamsFactory {
  public exchangeKeyForValue(
    type: number,
    data: string | undefined,
    args: unknown[],
  ) {
    if (!args) {
      return null;
    }
    switch (type as WsParamtype) {
      case WsParamtype.SOCKET:
        return args[0];
      case WsParamtype.PAYLOAD:
        return data ? args[1]?.[data] : args[1];
      case WsParamtype.ACK: {
        return args.find(arg => isFunction(arg));
      }
      case WsParamtype.PARAM: {
        const client = args[0] as
          { [WS_PATH_PARAMS]?: Record<PropertyKey, unknown> } | undefined;
        const pathParams = client?.[WS_PATH_PARAMS];

        if (!pathParams) {
          return data ? undefined : {};
        }

        return data ? pathParams[data] : pathParams;
      }
      default:
        return null;
    }
  }
}
