import { Controller } from '@nestjs/common/interfaces';
import { GuardsConsumer } from '@nestjs/core/guards/guards-consumer';
import { GuardsContextCreator } from '@nestjs/core/guards/guards-context-creator';
import { InterceptorsConsumer } from '@nestjs/core/interceptors/interceptors-consumer';
import { InterceptorsContextCreator } from '@nestjs/core/interceptors/interceptors-context-creator';
import { PipesConsumer } from '@nestjs/core/pipes/pipes-consumer';
import { PipesContextCreator } from '@nestjs/core/pipes/pipes-context-creator';
import { ExceptionFiltersContext } from './exception-filters-context';
import { WsProxy } from './ws-proxy';
export declare class WsContextCreator {
    private readonly wsProxy;
    private readonly exceptionFiltersContext;
    private readonly pipesCreator;
    private readonly pipesConsumer;
    private readonly guardsContextCreator;
    private readonly guardsConsumer;
    private readonly interceptorsContextCreator;
    private readonly interceptorsConsumer;
    constructor(wsProxy: WsProxy, exceptionFiltersContext: ExceptionFiltersContext, pipesCreator: PipesContextCreator, pipesConsumer: PipesConsumer, guardsContextCreator: GuardsContextCreator, guardsConsumer: GuardsConsumer, interceptorsContextCreator: InterceptorsContextCreator, interceptorsConsumer: InterceptorsConsumer);
    create(instance: Controller, callback: (...args) => void, module: any): (...args) => Promise<void>;
    reflectCallbackParamtypes(instance: Controller, callback: (...args) => any): any[];
    getDataMetatype(instance: any, callback: any): any;
    createGuardsFn(guards: any[], instance: Controller, callback: (...args) => any): Function | null;
}
