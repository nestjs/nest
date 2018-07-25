import { PARAMTYPES_METADATA } from '@nestjs/common/constants';
import { Controller } from '@nestjs/common/interfaces';
import { FORBIDDEN_MESSAGE } from '@nestjs/core/guards/constants';
import { GuardsConsumer } from '@nestjs/core/guards/guards-consumer';
import { GuardsContextCreator } from '@nestjs/core/guards/guards-context-creator';
import { InterceptorsConsumer } from '@nestjs/core/interceptors/interceptors-consumer';
import { InterceptorsContextCreator } from '@nestjs/core/interceptors/interceptors-context-creator';
import { PipesConsumer } from '@nestjs/core/pipes/pipes-consumer';
import { PipesContextCreator } from '@nestjs/core/pipes/pipes-context-creator';
import { Observable } from 'rxjs';
import { RpcException } from '..';
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
    callback: (data) => Observable<any>,
    module,
  ): (...args) => Promise<Observable<any>> {
    const exceptionHandler = this.exceptionFiltersContext.create(
      instance,
      callback,
      module,
    );
    const pipes = this.pipesCreator.create(instance, callback, module);
    const guards = this.guardsContextCreator.create(instance, callback, module);
    const metatype = this.getDataMetatype(instance, callback);
    const interceptors = this.interceptorsContextCreator.create(
      instance,
      callback,
      module,
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

    return this.rpcProxy.create(async (...args) => {
      const canActivate = await this.guardsConsumer.tryActivate(
        guards,
        args,
        instance,
        callback,
      );
      if (!canActivate) {
        throw new RpcException(FORBIDDEN_MESSAGE);
      }
      return await this.interceptorsConsumer.intercept(
        interceptors,
        args,
        instance,
        callback,
        handler(args),
      );
    }, exceptionHandler);
  }

  public reflectCallbackParamtypes(
    instance: Controller,
    callback: (...args) => any,
  ): any[] {
    return Reflect.getMetadata(PARAMTYPES_METADATA, instance, callback.name);
  }

  public getDataMetatype(instance, callback) {
    const paramtypes = this.reflectCallbackParamtypes(instance, callback);
    return paramtypes && paramtypes.length ? paramtypes[0] : null;
  }
}
