import { WsParamtype } from '../enums/ws-paramtype.enum';

export class WsParamsFactory {
  public exchangeKeyForValue(type: number, data: string, args: unknown[]) {
    if (!args) {
      return null;
    }
    switch (type as WsParamtype) {
      case WsParamtype.SOCKET:
        return args[0];
      case WsParamtype.PAYLOAD:
        return data ? args[1][data] : args[1];
      default:
        return null;
    }
  }
}
