import 'reflect-metadata';
import { RouteParamtypes } from '@nestjs/common/enums/route-paramtypes.enum';
import { Controller, Transform } from '@nestjs/common/interfaces';
import { RouteParamsMetadata } from '@nestjs/common/utils';
import { IRouteParamsFactory } from './interfaces/route-params-factory.interface';
import { PipesContextCreator } from './../pipes/pipes-context-creator';
import { PipesConsumer } from './../pipes/pipes-consumer';
import { ParamData, PipeTransform, RequestMethod } from '@nestjs/common';
import { GuardsContextCreator } from '../guards/guards-context-creator';
import { GuardsConsumer } from '../guards/guards-consumer';
import { InterceptorsContextCreator } from '../interceptors/interceptors-context-creator';
import { InterceptorsConsumer } from '../interceptors/interceptors-consumer';
export interface ParamProperties {
    index: number;
    type: RouteParamtypes | string;
    data: ParamData;
    pipes: PipeTransform<any>[];
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
    private readonly responseController;
    constructor(paramsFactory: IRouteParamsFactory, pipesContextCreator: PipesContextCreator, pipesConsumer: PipesConsumer, guardsContextCreator: GuardsContextCreator, guardsConsumer: GuardsConsumer, interceptorsContextCreator: InterceptorsContextCreator, interceptorsConsumer: InterceptorsConsumer);
    create(instance: Controller, callback: (...args) => any, methodName: string, module: string, requestMethod: RequestMethod): (req: any, res: any, next: any) => Promise<any>;
    mapParamType(key: string): string;
    reflectCallbackMetadata(instance: Controller, methodName: string): RouteParamsMetadata;
    reflectCallbackParamtypes(instance: Controller, methodName: string): any[];
    reflectHttpStatusCode(callback: (...args) => any): number;
    getArgumentsLength(keys: string[], metadata: RouteParamsMetadata): number;
    createNullArray(length: number): any[];
    exchangeKeysForValues(keys: string[], metadata: RouteParamsMetadata): ParamProperties[];
    getCustomFactory(factory: (...args) => void, data: any): (...args) => any;
    mergeParamsMetatypes(paramsProperties: ParamProperties[], paramtypes: any[]): (ParamProperties & {
        metatype?: any;
    })[];
    getParamValue<T>(value: T, {metatype, type, data}: {
        metatype: any;
        type: any;
        data: any;
    }, transforms: Transform<any>[]): Promise<any>;
}
