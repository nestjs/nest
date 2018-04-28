import 'reflect-metadata';
import { InstanceWrapper } from './container';
import { Module } from './module';
import { Type } from '@nestjs/common/interfaces/type.interface';
import { Controller } from '@nestjs/common/interfaces/controllers/controller.interface';
import { Injectable } from '@nestjs/common/interfaces/injectable.interface';
import { MiddlewareWrapper } from '../middleware/container';
export declare class Injector {
    loadInstanceOfMiddleware(wrapper: MiddlewareWrapper, collection: Map<string, MiddlewareWrapper>, module: Module): Promise<void>;
    loadInstanceOfRoute(wrapper: InstanceWrapper<Controller>, module: Module): Promise<void>;
    loadInstanceOfInjectable(wrapper: InstanceWrapper<Controller>, module: Module): Promise<void>;
    loadPrototypeOfInstance<T>({metatype, name}: InstanceWrapper<T>, collection: Map<string, InstanceWrapper<T>>): any;
    loadInstanceOfComponent(wrapper: InstanceWrapper<Injectable>, module: Module): Promise<void>;
    applyDoneSubject<T>(wrapper: InstanceWrapper<T>): () => void;
    loadInstance<T>(wrapper: InstanceWrapper<T>, collection: any, module: Module): Promise<void>;
    resolveConstructorParams<T>(wrapper: InstanceWrapper<T>, module: Module, inject: any[], callback: (args) => void): Promise<void>;
    reflectConstructorParams<T>(type: Type<T>): any[];
    reflectSelfParams<T>(type: Type<T>): any[];
    resolveSingleParam<T>(wrapper: InstanceWrapper<T>, param: Type<any> | string | symbol | any, {index, length}: {
        index: number;
        length: number;
    }, module: Module): Promise<any>;
    resolveParamToken<T>(wrapper: InstanceWrapper<T>, param: Type<any> | string | symbol | any): any;
    resolveComponentInstance<T>(module: Module, name: any, {index, length}: {
        index: number;
        length: number;
    }, wrapper: InstanceWrapper<T>): Promise<any>;
    lookupComponent(components: Map<string, any>, module: Module, {name, index, length}: {
        name: any;
        index: number;
        length: number;
    }, {metatype}: {
        metatype: any;
    }): Promise<any>;
    lookupComponentInExports(components: Map<string, any>, {name, index, length}: {
        name: any;
        index: number;
        length: number;
    }, module: Module, metatype: any): Promise<any>;
    lookupComponentInRelatedModules(module: Module, name: any): Promise<any>;
    resolveFactoryInstance(factoryResult: any): Promise<any>;
    flatMap(modules: Module[]): Module[];
}
