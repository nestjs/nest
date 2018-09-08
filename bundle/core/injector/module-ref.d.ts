import { Type } from '@nestjs/common';
import { NestContainer } from './container';
import { Module } from './module';
export declare abstract class ModuleRef {
    protected readonly container: NestContainer;
    private flattenModuleFixture;
    constructor(container: NestContainer);
    abstract get<TInput = any, TResult = TInput>(typeOrToken: Type<TInput> | string | symbol, options?: {
        strict: boolean;
    }): TResult;
    protected find<TInput = any, TResult = TInput>(typeOrToken: Type<TInput> | string | symbol): TResult;
    protected findInstanceByPrototypeOrToken<TInput = any, TResult = TInput>(metatypeOrToken: Type<TInput> | string | symbol, contextModule: Partial<Module>): TResult;
    private initFlattenModule();
}
