import { BaseRpcContext } from '../ctx-host/base-rpc.context';

export interface PreRequestHandler<TContext = BaseRpcContext, TData = any> {
  handle(data: TData, context: TContext, handler: CallableFunction);
}
