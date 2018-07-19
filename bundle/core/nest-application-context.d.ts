import { INestApplicationContext, OnModuleInit } from '@nestjs/common';
import { Type } from '@nestjs/common/interfaces/type.interface';
import { NestContainer } from './injector/container';
import { Module } from './injector/module';
export declare class NestApplicationContext implements INestApplicationContext {
    protected readonly container: NestContainer;
    private readonly scope;
    protected contextModule: Module;
    private readonly moduleTokenFactory;
    private contextModuleFixture;
    constructor(container: NestContainer, scope: Type<any>[], contextModule: Module);
    selectContextModule(): void;
    select<T>(module: Type<T>): INestApplicationContext;
    get<TInput = any, TResult = TInput>(typeOrToken: Type<TInput> | string | symbol, options?: {
        strict: boolean;
    }): TResult;
    find<TInput = any, TResult = TInput>(typeOrToken: Type<TInput> | string | symbol): TResult;
    init(): Promise<this>;
    protected callInitHook(): Promise<any>;
    protected callModuleInitHook(module: Module): Promise<any>;
    protected hasOnModuleInitHook(instance: any): instance is OnModuleInit;
    private findInstanceByPrototypeOrToken<TInput, TResult>(metatypeOrToken, contextModule);
    private initFlattenModule();
}
