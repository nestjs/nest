import { Controller } from '@nestjs/common/interfaces/controllers/controller.interface';
import { Injectable } from '@nestjs/common/interfaces/injectable.interface';
import { Type } from '@nestjs/common/interfaces/type.interface';
import 'reflect-metadata';
import { MiddlewareWrapper } from '../middleware/container';
import { InstanceWrapper } from './container';
import { Module } from './module';
export declare class Injector {
    loadInstanceOfMiddleware(wrapper: MiddlewareWrapper, collection: Map<string, MiddlewareWrapper>, module: Module): Promise<void>;
    loadInstanceOfRoute(wrapper: InstanceWrapper<Controller>, module: Module): Promise<void>;
    loadInstanceOfInjectable(wrapper: InstanceWrapper<Controller>, module: Module): Promise<void>;
    loadPrototypeOfInstance<T>({metatype, name}: InstanceWrapper<T>, collection: Map<string, InstanceWrapper<T>>): any;
    loadInstanceOfComponent(wrapper: InstanceWrapper<Injectable>, module: Module): Promise<void>;
    applyDoneSubject<T>(wrapper: InstanceWrapper<T>): () => void;
    loadInstance<T>(wrapper: InstanceWrapper<T>, collection: any, module: Module): Promise<void>;
    resolveConstructorParams<T>(wrapper: InstanceWrapper<T>, module: Module, inject: InjectorDependency[], callback: (args) => void): Promise<void>;
    reflectConstructorParams<T>(type: Type<T>): any[];
    reflectSelfParams<T>(type: Type<T>): any[];
    resolveSingleParam<T>(wrapper: InstanceWrapper<T>, param: Type<any> | string | symbol | any, dependencyContext: InjectorDependencyContext, module: Module): Promise<any>;
    resolveParamToken<T>(wrapper: InstanceWrapper<T>, param: Type<any> | string | symbol | any): any;
    resolveComponentInstance<T>(module: Module, name: any, dependencyContext: InjectorDependencyContext, wrapper: InstanceWrapper<T>): Promise<any>;
    lookupComponent<T = any>(components: Map<string, any>, module: Module, dependencyContext: InjectorDependencyContext, wrapper: InstanceWrapper<T>): Promise<any>;
    lookupComponentInExports<T = any>(components: Map<string, any>, dependencyContext: InjectorDependencyContext, module: Module, wrapper: InstanceWrapper<T>): Promise<any>;
    lookupComponentInRelatedModules(module: Module, name: any): Promise<any>;
    resolveFactoryInstance(factoryResult: any): Promise<any>;
    flatMap(modules: Module[]): Module[];
}
/**
 * The type of an injectable dependency
 */
export declare type InjectorDependency = Type<any> | Function | string;
/**
 * Context of a dependency which gets injected by
 * the injector
 */
export interface InjectorDependencyContext {
    /**
     * The name of the function or injection token
     */
    name?: string;
    /**
     * The index of the dependency which gets injected
     * from the dependencies array
     */
    index: number;
    /**
     * The dependency array which gets injected
     */
    dependencies: InjectorDependency[];
}
