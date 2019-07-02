export type ContextType = 'http' | 'ws' | 'rpc';

export interface HttpArgumentsHost {
  getRequest<T = any>(): T;
  getResponse<T = any>(): T;
  getNext<T = any>(): T;
}

export interface WsArgumentsHost {
  getData<T = any>(): T;
  getClient<T = any>(): T;
}

export interface RpcArgumentsHost {
  getData<T = any>(): T;
}

export interface ArgumentsHost<TContext extends string = ContextType> {
  getType(): TContext;
  getArgs<TArgs extends Array<any> = any[]>(): TArgs;
  getArgByIndex<TArg = any>(index: number): TArg;
  switchToRpc(): RpcArgumentsHost;
  switchToHttp(): HttpArgumentsHost;
  switchToWs(): WsArgumentsHost;
}
