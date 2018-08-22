import { ParamData } from '@nestjs/common';
import { Controller, Transform } from '@nestjs/common/interfaces';
import 'reflect-metadata';
import { GuardsConsumer } from '../guards/guards-consumer';
import { GuardsContextCreator } from '../guards/guards-context-creator';
import { Module } from '../injector/module';
import { ModulesContainer } from '../injector/modules-container';
import { InterceptorsConsumer } from '../interceptors/interceptors-consumer';
import { InterceptorsContextCreator } from '../interceptors/interceptors-context-creator';
import { PipesConsumer } from '../pipes/pipes-consumer';
import { PipesContextCreator } from '../pipes/pipes-context-creator';
import { ParamProperties } from './context-utils';
export interface ParamsMetadata {
    [prop: number]: {
        index: number;
        data?: ParamData;
    };
}
export interface ParamsFactory {
    exchangeKeyForValue(type: number, data: ParamData, args: any): any;
}
export declare class ExternalContextCreator {
    private readonly guardsContextCreator;
    private readonly guardsConsumer;
    private readonly interceptorsContextCreator;
    private readonly interceptorsConsumer;
    private readonly modulesContainer;
    private readonly pipesContextCreator;
    private readonly pipesConsumer;
    private readonly contextUtils;
    constructor(guardsContextCreator: GuardsContextCreator, guardsConsumer: GuardsConsumer, interceptorsContextCreator: InterceptorsContextCreator, interceptorsConsumer: InterceptorsConsumer, modulesContainer: ModulesContainer, pipesContextCreator: PipesContextCreator, pipesConsumer: PipesConsumer);
    create<T extends ParamsMetadata = ParamsMetadata>(instance: Controller, callback: (...args) => any, methodName: string, metadataKey?: string, paramsFactory?: ParamsFactory): (...args: any[]) => Promise<any>;
    findContextModuleName(constructor: Function): string;
    findComponentByClassName(module: Module, className: string): boolean;
    exchangeKeysForValues<TMetadata = any>(keys: string[], metadata: TMetadata, moduleContext: string, paramsFactory: ParamsFactory): ParamProperties[];
    getCustomFactory(factory: (...args) => void, data: any): (...args) => any;
    createPipesFn(pipes: any[], paramsOptions: (ParamProperties & {
        metatype?: any;
    })[]): (args: any, ...gqlArgs: any[]) => Promise<void>;
    getParamValue<T>(value: T, {metatype, type, data}: {
        metatype: any;
        type: any;
        data: any;
    }, transforms: Transform<any>[]): Promise<any>;
    transformToResult(resultOrDeffered: any): Promise<any>;
}
