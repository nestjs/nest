import { PARAMTYPES_METADATA } from '@nestjs/common/constants';
import { ContextType, Controller } from '@nestjs/common/interfaces';
import { FORBIDDEN_MESSAGE } from '@nestjs/core/guards/constants';
import { GuardsConsumer } from '@nestjs/core/guards/guards-consumer';
import { GuardsContextCreator } from '@nestjs/core/guards/guards-context-creator';
import { STATIC_CONTEXT } from '@nestjs/core/injector/constants';
import { InterceptorsConsumer } from '@nestjs/core/interceptors/interceptors-consumer';
import { InterceptorsContextCreator } from '@nestjs/core/interceptors/interceptors-context-creator';
import { PipesConsumer } from '@nestjs/core/pipes/pipes-consumer';
import { PipesContextCreator } from '@nestjs/core/pipes/pipes-context-creator';
import { Observable } from 'rxjs';
import { RpcException } from '../exceptions';
import { ExceptionFiltersContext } from './exception-filters-context';
import { RpcProxy } from './rpc-proxy';

export class RpcContextCreator {
  constructor(
    private readonly rpcProxy: RpcProxy,
    private readonly exceptionFiltersContext: ExceptionFiltersContext,
    private readonly pipesCreator: PipesContextCreator,
    private readonly pipesConsumer: PipesConsumer,
    private readonly guardsContextCreator: GuardsContextCreator,
    private readonly guardsConsumer: GuardsConsumer,
    private readonly interceptorsContextCreator: InterceptorsContextCreator,
    private readonly interceptorsConsumer: InterceptorsConsumer,
  ) {}

  public create(
    instance: Controller,
    callback: (data: any, ...args: any[]) => Observable<any>,
    module: string,
    contextId = STATIC_CONTEXT,
    inquirerId?: string,
  ): (...args: any[]) => Promise<Observable<any>> {
    const contextType: ContextType = 'rpc';
    const exceptionHandler = this.exceptionFiltersContext.create(
      instance,
      callback,
      module,
      contextId,
      inquirerId,
    );
    const pipes = this.pipesCreator.create(
      instance,
      callback,
      module,
      contextId,
      inquirerId,
    );
    const guards = this.guardsContextCreator.create(
      instance,
      callback,
      module,
      contextId,
      inquirerId,
    );
    const metatype = this.getDataMetatype(instance, callback);
    const interceptors = this.interceptorsContextCreator.create(
      instance,
      callback,
      module,
      contextId,
      inquirerId,
    );
    const fnCanActivate = this.createGuardsFn(
      guards,
      instance,
      callback,
      contextType,
    );
    const handler = (args: any[]) => async () => {
      const [data, ...params] = args;
      const result = await this.pipesConsumer.applyPipes(
        data,
        { metatype },
        pipes,
      );
      return callback.call(instance, result, ...params);
    };

    return this.rpcProxy.create(async (...args: any[]) => {
      fnCanActivate && (await fnCanActivate(args));

      return this.interceptorsConsumer.intercept(
        interceptors,
        args,
        instance,
        callback,
        handler(args),
        contextType,
      );
    }, exceptionHandler);
  }

  public reflectCallbackParamtypes(
    instance: Controller,
    callback: (...args: any[]) => any,
  ): any[] {
    return Reflect.getMetadata(PARAMTYPES_METADATA, instance, callback.name);
  }

  public getDataMetatype(
    instance: Controller,
    callback: (...args: any[]) => any,
  ) {
    const paramtypes = this.reflectCallbackParamtypes(instance, callback);
    return paramtypes && paramtypes.length ? paramtypes[0] : null;
  }

  public createGuardsFn<TContext extends ContextType = ContextType>(
    guards: any[],
    instance: Controller,
    callback: (...args: any[]) => any,
    contextType?: TContext,
  ): Function | null {
    const canActivateFn = async (args: any[]) => {
      const canActivate = await this.guardsConsumer.tryActivate<TContext>(
        guards,
        args,
        instance,
        callback,
        contextType,
      );
      if (!canActivate) {
        throw new RpcException(FORBIDDEN_MESSAGE);
      }
    };
    return guards.length ? canActivateFn : null;
  }
}
