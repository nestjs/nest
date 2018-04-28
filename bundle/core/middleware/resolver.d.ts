import { MiddlewareContainer } from './container';
import { Module } from '../injector/module';
export declare class MiddlewareResolver {
    private readonly middlewareContainer;
    private readonly instanceLoader;
    constructor(middlewareContainer: MiddlewareContainer);
    resolveInstances(module: Module, moduleName: string): Promise<void>;
    private resolveMiddlewareInstance(wrapper, middleware, module);
}
