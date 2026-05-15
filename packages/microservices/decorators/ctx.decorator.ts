import { RpcParamtype } from '../enums/rpc-paramtype.enum.js';
import { createRpcParamDecorator } from '../utils/param.utils.js';

export const Ctx: () => ParameterDecorator = createRpcParamDecorator(
  RpcParamtype.CONTEXT,
);
