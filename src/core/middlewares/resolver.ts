import { MiddlewaresContainer, MiddlewareWrapper } from './container';
import { Injector } from '../injector/injector';
import { Module } from '../injector/module';

export class MiddlewaresResolver {
    private readonly instanceLoader = new Injector();

    constructor(private middlewaresContainer: MiddlewaresContainer) {}

    resolveInstances(module: Module, moduleName: string) {
        const middlewares = this.middlewaresContainer.getMiddlewares(moduleName);

        middlewares.forEach((wrapper) => {
            this.resolveMiddlewareInstance(wrapper, middlewares, module);
        });
    }

    private resolveMiddlewareInstance(
        wrapper: MiddlewareWrapper,
        middlewares: Map<string, MiddlewareWrapper>,
        module: Module) {

        this.instanceLoader.loadInstanceOfMiddleware(
            wrapper,
            middlewares,
            module
        );
    }

}
