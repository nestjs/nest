import { RpcParamtype } from '../enums/rpc-paramtype.enum';

export const DEFAULT_CALLBACK_METADATA = {
  [`${RpcParamtype.PAYLOAD}:0`]: { index: 0, data: undefined, pipes: [] },
};
export const DEFAULT_GRPC_CALLBACK_METADATA = {
  [`${RpcParamtype.CONTEXT}:1`]: { index: 1, data: undefined, pipes: [] },
  [`${RpcParamtype.GRPC_CALL}:2`]: { index: 2, data: undefined, pipes: [] },
  ...DEFAULT_CALLBACK_METADATA,
};
