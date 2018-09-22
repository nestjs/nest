import { INestApplicationContext, LoggerService, OnApplicationBootstrap, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Type } from '@nestjs/common/interfaces/type.interface';
import { NestContainer } from './injector/container';
import { Module } from './injector/module';
import { ModuleRef } from './injector/module-ref';
export declare class NestApplicationContext extends ModuleRef implements INestApplicationContext {
    private readonly scope;
    protected contextModule: Module;
    private readonly moduleTokenFactory;
    constructor(container: NestContainer, scope: Type<any>[], contextModule: Module);
    selectContextModule(): void;
    select<T>(module: Type<T>): INestApplicationContext;
    get<TInput = any, TResult = TInput>(typeOrToken: Type<TInput> | string | symbol, options?: {
        strict: boolean;
    }): TResult;
    init(): Promise<this>;
    close(): Promise<void>;
    useLogger(logger: LoggerService): void;
    protected callInitHook(): Promise<any>;
    protected callModuleInitHook(module: Module): Promise<any>;
    protected hasOnModuleInitHook(instance: any): instance is OnModuleInit;
    protected callDestroyHook(): Promise<any>;
    protected callModuleDestroyHook(module: Module): Promise<any>;
    protected hasOnModuleDestroyHook(instance: any): instance is OnModuleDestroy;
    protected callBootstrapHook(): Promise<any>;
    protected callModuleBootstrapHook(module: Module): Promise<any>;
    protected hasOnAppBotstrapHook(instance: any): instance is OnApplicationBootstrap;
}
