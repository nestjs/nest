import { ExecutionContext } from '@nestjs/common';
import { Type } from '@nestjs/common/interfaces';
import {
  ContextType,
  HttpArgumentsHost,
  RpcArgumentsHost,
  WsArgumentsHost,
} from '@nestjs/common/interfaces/features/arguments-host.interface';
import { RuntimeException } from '../errors/exceptions/runtime.exception';
import { INVALID_EXECUTION_CONTEXT } from './messages';

export class ExecutionContextHost<TContext extends ContextType = ContextType>
  implements ExecutionContext<TContext> {
  private contextType: TContext = 'http' as TContext;

  constructor(
    private readonly args: any[],
    private readonly constructorRef: Type<any> = null,
    private readonly handler: Function = null,
  ) {}

  setType(type: TContext) {
    type && (this.contextType = type);
  }

  getType(): TContext {
    return this.contextType;
  }

  getClass<T = any>(): Type<T> {
    return this.constructorRef;
  }

  getHandler(): Function {
    return this.handler;
  }

  getArgs<T extends Array<any> = any[]>(): T {
    return this.args as T;
  }

  getArgByIndex<T = any>(index: number): T {
    return this.args[index] as T;
  }

  switchToRpc(): RpcArgumentsHost {
    if (this.contextType !== 'rpc') {
      throw new RuntimeException(
        INVALID_EXECUTION_CONTEXT(this.contextType, 'switchToRpc()'),
      );
    }
    return Object.assign(this, {
      getData: () => this.getArgByIndex(0),
    });
  }

  switchToHttp(): HttpArgumentsHost {
    if (this.contextType !== 'http') {
      throw new RuntimeException(
        INVALID_EXECUTION_CONTEXT(this.contextType, 'switchToHttp()'),
      );
    }
    return Object.assign(this, {
      getRequest: () => this.getArgByIndex(0),
      getResponse: () => this.getArgByIndex(1),
      getNext: () => this.getArgByIndex(2),
    });
  }

  switchToWs(): WsArgumentsHost {
    if (this.contextType !== 'ws') {
      throw new RuntimeException(
        INVALID_EXECUTION_CONTEXT(this.contextType, 'switchToWs()'),
      );
    }
    return Object.assign(this, {
      getClient: () => this.getArgByIndex(0),
      getData: () => this.getArgByIndex(1),
    });
  }
}
