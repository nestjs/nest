import { Observable } from 'rxjs/Observable';
import { WsProxy } from './ws-proxy';
import { WsExceptionsHandler } from '../exceptions/ws-exceptions-handler';
import { ExceptionFiltersContext } from './exception-filters-context';
import { Controller } from '@nestjs/common/interfaces';
import { PipesContextCreator } from '@nestjs/core/pipes/pipes-context-creator';
import { PipesConsumer } from '@nestjs/core/pipes/pipes-consumer';
import { PARAMTYPES_METADATA } from '@nestjs/common/constants';
import { GuardsContextCreator } from '@nestjs/core/guards/guards-context-creator';
import { GuardsConsumer } from '@nestjs/core/guards/guards-consumer';
import { FORBIDDEN_MESSAGE } from '@nestjs/core/guards/constants';
import { WsException } from '../exceptions/ws-exception';

export class WsContextCreator {
    constructor(
        private readonly wsProxy: WsProxy,
        private readonly exceptionFiltersContext: ExceptionFiltersContext,
        private readonly pipesCreator: PipesContextCreator,
        private readonly pipesConsumer: PipesConsumer,
        private readonly guardsContextCreator: GuardsContextCreator,
        private readonly guardsConsumer: GuardsConsumer) {}

    public create(
        instance: Controller,
        callback: (client, data) => void,
        module): (client, data) => Promise<void> {

        const exceptionHandler = this.exceptionFiltersContext.create(instance, callback);
        const pipes = this.pipesCreator.create(instance, callback);
        const guards = this.guardsContextCreator.create(instance, callback, module);

        const metatype = this.getDataMetatype(instance, callback);
        return this.wsProxy.create(async (client, data) => {
            const canActivate = await this.guardsConsumer.tryActivate(guards, data, instance, callback);
            if (!canActivate) {
                throw new WsException(FORBIDDEN_MESSAGE);
            }
            const result = await this.pipesConsumer.applyPipes(data, { metatype }, pipes);
            callback.call(instance, client, data);
        }, exceptionHandler);
    }

    public reflectCallbackParamtypes(instance: Controller, callback: (...args) => any): any[] {
        return Reflect.getMetadata(PARAMTYPES_METADATA, instance, callback.name);
    }

    public getDataMetatype(instance, callback) {
        const paramtypes = this.reflectCallbackParamtypes(instance, callback);
        return paramtypes && paramtypes.length ? paramtypes[1] : null;
    }
}