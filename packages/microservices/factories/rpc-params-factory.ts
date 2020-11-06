import { RpcParamtype } from '../enums/rpc-paramtype.enum';

export class RpcParamsFactory {
  public exchangeKeyForValue(type: number, args: unknown[]) {
    if (!args) {
      return null;
    }
    switch (type as RpcParamtype) {
      case RpcParamtype.PAYLOAD:
        return args[0];
      case RpcParamtype.CONTEXT:
        return args[1];
      case RpcParamtype.GRPC_CALL:
        return args[2];
      default:
        return null;
    }
  }
}
