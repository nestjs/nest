import { RpcParamtype } from '../enums/rpc-paramtype.enum';

export const DEFAULT_CALLBACK_METADATA = {
  [`${RpcParamtype.CONTEXT}:1`]: { index: 1, data: undefined, pipes: [] },
  [`${RpcParamtype.PAYLOAD}:0`]: { index: 0, data: undefined, pipes: [] },
};
