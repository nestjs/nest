import "reflect-metadata";
import { Middleware, MiddlewareConfiguration } from "./builder";
import { InstanceWrapper, NestContainer, ModuleDependencies } from "../container";
import { Route } from "../interfaces/route.interface";
import { RouteProps } from "../interfaces/route-props.interface";
import { MiddlewaresContainer } from "./container";
import { NestInstanceLoader } from "../instance-loader";

export class MiddlewaresResolver {
    private instanceLoader = new NestInstanceLoader();

    constructor(
        private middlewaresContainer: MiddlewaresContainer,
        private modulesContainer: NestContainer) {}

    resolveInstances(module: ModuleDependencies) {
        const middlewares = this.middlewaresContainer.getMiddlewares();

        middlewares.forEach((val, middlewareType) => {
            this.instanceLoader.loadInstanceOfMiddleware(middlewareType, middlewares, module);
        });
    }

}

export interface MiddlewareDependencies extends InstanceWrapper<Middleware> {
    forRoutes: (Route | RouteProps)[];
}
