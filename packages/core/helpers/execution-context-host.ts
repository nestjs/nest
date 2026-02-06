import { ExecutionContext } from '@nestjs/common';
import { Type } from '@nestjs/common/interfaces';
import {
  ContextType,
  HttpArgumentsHost,
  RpcArgumentsHost,
  WsArgumentsHost,
} from '@nestjs/common/interfaces/features/arguments-host.interface';

export class ExecutionContextHost implements ExecutionContext {
  private contextType = 'http';
  private httpCache?: HttpArgumentsHost;
  private rpcCache?: RpcArgumentsHost;
  private wsCache?: WsArgumentsHost;

  constructor(
    private readonly args: any[],
    private readonly constructorRef: Type<any> | null = null,
    private readonly handler: Function | null = null,
  ) {}

  setType<TContext extends string = ContextType>(type: TContext) {
    type && (this.contextType = type);
  }

  getType<TContext extends string = ContextType>(): TContext {
    return this.contextType as TContext;
  }

  getClass<T = any>(): Type<T> {
    return this.constructorRef!;
  }

  getHandler(): Function {
    return this.handler!;
  }

  getArgs<T extends Array<any> = any[]>(): T {
    return this.args as T;
  }

  getArgByIndex<T = any>(index: number): T {
    return this.args[index] as T;
  }

  switchToRpc(): RpcArgumentsHost {
    if (!this.rpcCache) {
      this.rpcCache = Object.assign(this, {
        getData: () => this.getArgByIndex(0),
        getContext: () => this.getArgByIndex(1),
      });
    }
    return this.rpcCache;
  }

  switchToHttp(): HttpArgumentsHost {
    if (!this.httpCache) {
      this.httpCache = Object.assign(this, {
        getRequest: () => this.getArgByIndex(0),
        getResponse: () => this.getArgByIndex(1),
        getNext: () => this.getArgByIndex(2),
      });
    }
    return this.httpCache;
  }

  switchToWs(): WsArgumentsHost {
    if (!this.wsCache) {
      this.wsCache = Object.assign(this, {
        getClient: () => this.getArgByIndex(0),
        getData: () => this.getArgByIndex(1),
        getPattern: () => this.getArgByIndex(this.getArgs().length - 1),
      });
    }
    return this.wsCache;
  }
}
