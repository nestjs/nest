import 'reflect-metadata';
import { InstanceWrapper } from './container';
import { Module } from './module';
import { Metatype } from '@nestjs/common/interfaces/metatype.interface';
import { Controller } from '@nestjs/common/interfaces/controllers/controller.interface';
import { Injectable } from '@nestjs/common/interfaces/injectable.interface';
import { MiddlewareWrapper } from '../middlewares/container';
export declare class Injector {
  loadInstanceOfMiddleware(
    wrapper: MiddlewareWrapper,
    collection: Map<string, MiddlewareWrapper>,
    module: Module
  ): Promise<void>;
  loadInstanceOfRoute(
    wrapper: InstanceWrapper<Controller>,
    module: Module
  ): Promise<void>;
  loadInstanceOfInjectable(
    wrapper: InstanceWrapper<Controller>,
    module: Module
  ): Promise<void>;
  loadPrototypeOfInstance<T>(
    { metatype, name }: InstanceWrapper<T>,
    collection: Map<string, InstanceWrapper<T>>
  ): any;
  loadInstanceOfComponent(
    wrapper: InstanceWrapper<Injectable>,
    module: Module,
    context?: Module[]
  ): Promise<void>;
  applyDoneSubject<T>(wrapper: InstanceWrapper<T>): () => void;
  loadInstance<T>(
    wrapper: InstanceWrapper<T>,
    collection: any,
    module: Module,
    context?: Module[]
  ): Promise<void>;
  resolveConstructorParams<T>(
    wrapper: InstanceWrapper<T>,
    module: Module,
    inject: any[],
    context: Module[],
    callback: (args) => void
  ): Promise<void>;
  reflectConstructorParams<T>(type: Metatype<T>): any[];
  reflectSelfParams<T>(type: Metatype<T>): any[];
  resolveSingleParam<T>(
    wrapper: InstanceWrapper<T>,
    param: Metatype<any> | string | symbol | any,
    {
      index,
      length
    }: {
      index: number;
      length: number;
    },
    module: Module,
    context: Module[]
  ): Promise<any>;
  resolveParamToken<T>(
    wrapper: InstanceWrapper<T>,
    param: Metatype<any> | string | symbol | any
  ): any;
  resolveComponentInstance<T>(
    module: Module,
    name: any,
    {
      index,
      length
    }: {
      index: number;
      length: number;
    },
    wrapper: InstanceWrapper<T>,
    context: Module[]
  ): Promise<any>;
  scanForComponent(
    components: Map<string, any>,
    module: Module,
    {
      name,
      index,
      length
    }: {
      name: any;
      index: number;
      length: number;
    },
    {
      metatype
    }: {
      metatype: any;
    },
    context?: Module[]
  ): any;
  scanForComponentInExports(
    components: Map<string, any>,
    {
      name,
      index,
      length
    }: {
      name: any;
      index: number;
      length: number;
    },
    module: Module,
    metatype: any,
    context?: Module[]
  ): Promise<any>;
  scanForComponentInScopes(
    context: Module[],
    {
      name,
      index,
      length
    }: {
      name: any;
      index: number;
      length: number;
    },
    metatype: any
  ): any;
  scanForComponentInScope(
    context: Module,
    {
      name,
      index,
      length
    }: {
      name: any;
      index: number;
      length: number;
    },
    metatype: any
  ): any;
  scanForComponentInRelatedModules(
    module: Module,
    name: any,
    context: Module[]
  ): Promise<any>;
  resolveFactoryInstance(factoryResult: any): Promise<any>;
  flatMap(modules: Module[]): Module[];
}
