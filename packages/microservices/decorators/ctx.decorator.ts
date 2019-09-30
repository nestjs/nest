import { RpcParamtype } from '../enums/rpc-paramtype.enum';
import { createRpcParamDecorator } from '../utils/param.utils';

export const Ctx: () => ParameterDecorator = createRpcParamDecorator(
  RpcParamtype.CONTEXT,
);
