import { BaseRpcContext } from '../ctx-host/base-rpc.context';

export interface RequestContext<
  TData = any,
  TContext extends BaseRpcContext = any
> {
  pattern: string | Record<string, any>;
  data: TData;
  context?: TContext;

  getData(): TData;
  getPattern(): string | Record<string, any>;
  getContext(): TContext;
}
