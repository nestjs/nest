import { MiddlewaresContainer } from './container';
import { Module } from '../injector/module';
export declare class MiddlewaresResolver {
    private readonly middlewaresContainer;
    private readonly instanceLoader;
    constructor(middlewaresContainer: MiddlewaresContainer);
    resolveInstances(module: Module, moduleName: string): Promise<void>;
    private resolveMiddlewareInstance(wrapper, middlewares, module);
}
