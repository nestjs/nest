import { Observable } from 'rxjs/Observable';
import { RpcProxy } from './rpc-proxy';
import { RpcExceptionsHandler } from '../exceptions/rpc-exceptions-handler';
import { ExceptionFiltersContext } from './exception-filters-context';
import { Controller } from '@nestjs/common/interfaces';
import { PipesContextCreator } from '@nestjs/core/pipes/pipes-context-creator';
import { PipesConsumer } from '@nestjs/core/pipes/pipes-consumer';
import { PARAMTYPES_METADATA } from '@nestjs/common/constants';
import { GuardsContextCreator } from '@nestjs/core/guards/guards-context-creator';
import { GuardsConsumer } from '@nestjs/core/guards/guards-consumer';
import { FORBIDDEN_MESSAGE } from '@nestjs/core/guards/constants';
import { RpcException } from '../index';
import { InterceptorsContextCreator } from '@nestjs/core/interceptors/interceptors-context-creator';
import { InterceptorsConsumer } from '@nestjs/core/interceptors/interceptors-consumer';

export class RpcContextCreator {
  constructor(
    private readonly rpcProxy: RpcProxy,
    private readonly exceptionFiltersContext: ExceptionFiltersContext,
    private readonly pipesCreator: PipesContextCreator,
    private readonly pipesConsumer: PipesConsumer,
    private readonly guardsContextCreator: GuardsContextCreator,
    private readonly guardsConsumer: GuardsConsumer,
    private readonly interceptorsContextCreator: InterceptorsContextCreator,
    private readonly interceptorsConsumer: InterceptorsConsumer
  ) {}

  public create(
    instance: Controller,
    callback: (data) => Observable<any>,
    module
  ): (data) => Promise<Observable<any>> {
    const exceptionHandler = this.exceptionFiltersContext.create(
      instance,
      callback
    );
    const pipes = this.pipesCreator.create(instance, callback);
    const guards = this.guardsContextCreator.create(instance, callback, module);
    const metatype = this.getDataMetatype(instance, callback);
    const interceptors = this.interceptorsContextCreator.create(
      instance,
      callback,
      module
    );

    return this.rpcProxy.create(async data => {
      const canActivate = await this.guardsConsumer.tryActivate(
        guards,
        data,
        instance,
        callback
      );
      if (!canActivate) {
        throw new RpcException(FORBIDDEN_MESSAGE);
      }
      const result = await this.pipesConsumer.applyPipes(
        data,
        { metatype },
        pipes
      );
      const handler = () => callback.call(instance, result);

      return await this.interceptorsConsumer.intercept(
        interceptors,
        result,
        instance,
        callback,
        handler
      );
    }, exceptionHandler);
  }

  public reflectCallbackParamtypes(
    instance: Controller,
    callback: (...args) => any
  ): any[] {
    return Reflect.getMetadata(PARAMTYPES_METADATA, instance, callback.name);
  }

  public getDataMetatype(instance, callback) {
    const paramtypes = this.reflectCallbackParamtypes(instance, callback);
    return paramtypes && paramtypes.length ? paramtypes[0] : null;
  }
}
