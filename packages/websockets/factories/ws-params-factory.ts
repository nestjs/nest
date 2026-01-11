import { isFunction } from '@nestjs/common/utils/shared.utils';
import { WsParamtype } from '../enums/ws-paramtype.enum';

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
        // Path parameters are extracted from the WebSocket handshake request
        // and stored in the client object during connection establishment
        const client = args[0] as any;
        const pathParams =
          client?._pathParams ||
          client?.upgradeReq?.params ||
          client?.request?.params;

        if (!pathParams) {
          return data ? undefined : {};
        }

        return data && pathParams ? pathParams[data] : pathParams;
      }
      default:
        return null;
    }
  }
}
