import { BaseRpcContext } from '../ctx-host/base-rpc.context';
import { RequestContext } from '../interfaces';

export class RequestContextHost<
  TData = any,
  TContext extends BaseRpcContext = any
> implements RequestContext<TData> {
  constructor(
    public readonly pattern: string | Record<string, any>,
    public readonly data: TData,
    public readonly context: TContext,
  ) {}

  static create<TData, TContext extends BaseRpcContext>(
    pattern: string | Record<string, any>,
    data: TData,
    context: TContext,
  ): RequestContext<TData, TContext> {
    const host = new RequestContextHost(pattern, data, context);
    return host;
  }

  public getData(): TData {
    return this.data;
  }

  public getPattern(): string | Record<string, any> {
    return this.pattern;
  }

  public getContext(): TContext {
    return this.context;
  }
}
