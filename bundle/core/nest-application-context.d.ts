import { NestContainer } from './injector/container';
import { Type } from '@nestjs/common/interfaces/type.interface';
import { INestApplicationContext, OnModuleInit } from '@nestjs/common';
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
    get<T>(typeOrToken: Type<T> | string | symbol, options?: {
        strict: boolean;
    }): T;
    find<T>(typeOrToken: Type<T> | string | symbol): T;
    init(): Promise<this>;
    protected callInitHook(): Promise<any>;
    protected callModuleInitHook(module: Module): Promise<any>;
    protected hasOnModuleInitHook(instance: any): instance is OnModuleInit;
    private findInstanceByPrototypeOrToken<T>(metatypeOrToken, contextModule);
    private initFlattenModule();
}
