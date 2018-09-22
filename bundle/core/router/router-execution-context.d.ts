import { HttpServer, ParamData, PipeTransform, RequestMethod } from '@nestjs/common';
import { RouteParamsMetadata } from '@nestjs/common/decorators';
import { RouteParamtypes } from '@nestjs/common/enums/route-paramtypes.enum';
import { Controller, Transform } from '@nestjs/common/interfaces';
import 'reflect-metadata';
import { GuardsConsumer } from '../guards/guards-consumer';
import { GuardsContextCreator } from '../guards/guards-context-creator';
import { InterceptorsConsumer } from '../interceptors/interceptors-consumer';
import { InterceptorsContextCreator } from '../interceptors/interceptors-context-creator';
import { PipesConsumer } from '../pipes/pipes-consumer';
import { PipesContextCreator } from '../pipes/pipes-context-creator';
import { IRouteParamsFactory } from './interfaces/route-params-factory.interface';
import { CustomHeader } from './router-response-controller';
export interface ParamProperties {
    index: number;
    type: RouteParamtypes | string;
    data: ParamData;
    pipes: PipeTransform[];
    extractValue: (req, res, next) => any;
}
export declare class RouterExecutionContext {
    private readonly paramsFactory;
    private readonly pipesContextCreator;
    private readonly pipesConsumer;
    private readonly guardsContextCreator;
    private readonly guardsConsumer;
    private readonly interceptorsContextCreator;
    private readonly interceptorsConsumer;
    private readonly applicationRef;
    private readonly contextUtils;
    private readonly responseController;
    constructor(paramsFactory: IRouteParamsFactory, pipesContextCreator: PipesContextCreator, pipesConsumer: PipesConsumer, guardsContextCreator: GuardsContextCreator, guardsConsumer: GuardsConsumer, interceptorsContextCreator: InterceptorsContextCreator, interceptorsConsumer: InterceptorsConsumer, applicationRef: HttpServer);
    create(instance: Controller, callback: (...args) => any, methodName: string, module: string, requestMethod: RequestMethod): (req: any, res: any, next: any) => Promise<void>;
    reflectHttpStatusCode(callback: (...args) => any): number;
    reflectRenderTemplate(callback: any): string;
    reflectResponseHeaders(callback: any): CustomHeader[];
    exchangeKeysForValues(keys: string[], metadata: RouteParamsMetadata, moduleContext: string): ParamProperties[];
    getCustomFactory(factory: (...args) => void, data: any): (...args) => any;
    getParamValue<T>(value: T, {metatype, type, data}: {
        metatype: any;
        type: any;
        data: any;
    }, transforms: Transform<any>[]): Promise<any>;
    createGuardsFn(guards: any[], instance: Controller, callback: (...args) => any): Function | null;
    createPipesFn(pipes: any[], paramsOptions: (ParamProperties & {
        metatype?: any;
    })[]): (args: any, req: any, res: any, next: any) => Promise<void>;
    createHandleResponseFn(callback: any, isResponseHandled: boolean, httpStatusCode: number): (result: any, res: any) => Promise<void>;
}
