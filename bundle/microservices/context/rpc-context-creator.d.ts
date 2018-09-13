import { Controller } from '@nestjs/common/interfaces';
import { GuardsConsumer } from '@nestjs/core/guards/guards-consumer';
import { GuardsContextCreator } from '@nestjs/core/guards/guards-context-creator';
import { InterceptorsConsumer } from '@nestjs/core/interceptors/interceptors-consumer';
import { InterceptorsContextCreator } from '@nestjs/core/interceptors/interceptors-context-creator';
import { PipesConsumer } from '@nestjs/core/pipes/pipes-consumer';
import { PipesContextCreator } from '@nestjs/core/pipes/pipes-context-creator';
import { Observable } from 'rxjs';
import { ExceptionFiltersContext } from './exception-filters-context';
import { RpcProxy } from './rpc-proxy';
export declare class RpcContextCreator {
    private readonly rpcProxy;
    private readonly exceptionFiltersContext;
    private readonly pipesCreator;
    private readonly pipesConsumer;
    private readonly guardsContextCreator;
    private readonly guardsConsumer;
    private readonly interceptorsContextCreator;
    private readonly interceptorsConsumer;
    constructor(rpcProxy: RpcProxy, exceptionFiltersContext: ExceptionFiltersContext, pipesCreator: PipesContextCreator, pipesConsumer: PipesConsumer, guardsContextCreator: GuardsContextCreator, guardsConsumer: GuardsConsumer, interceptorsContextCreator: InterceptorsContextCreator, interceptorsConsumer: InterceptorsConsumer);
    create(instance: Controller, callback: (data) => Observable<any>, module: any): (...args) => Promise<Observable<any>>;
    reflectCallbackParamtypes(instance: Controller, callback: (...args) => any): any[];
    getDataMetatype(instance: any, callback: any): any;
    createGuardsFn(guards: any[], instance: Controller, callback: (...args) => any): Function | null;
}
