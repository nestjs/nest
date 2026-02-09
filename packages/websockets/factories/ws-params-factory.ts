import { isFunction } from '@nestjs/common/utils/shared.utils.js';
import { WsParamtype } from '../enums/ws-paramtype.enum.js';

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
      default:
        return null;
    }
  }
}
