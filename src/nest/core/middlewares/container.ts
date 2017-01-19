import "reflect-metadata";
import { Middleware, MiddlewareConfiguration } from "./builder";
import { InstanceWrapper } from "../container";
import { Route } from "../interfaces/route.interface";
import { RouteProps } from "../interfaces/route-props.interface";

export class MiddlewaresContainer {
    private readonly midlewares = new Map<Middleware, Middleware>();
    private readonly configs: MiddlewareConfiguration[] = [];

    getMiddlewares(): Map<Middleware, Middleware> {
        return this.midlewares;
    }

    getConfigs(): MiddlewareConfiguration[] {
        return this.configs.slice(0);
    }

    addConfig(configList: MiddlewareConfiguration[]) {
        configList.map((config) => {
            (<Middleware[]>config.middlewares).map((middleware) => this.midlewares.set(middleware, null));
            this.configs.push(config);
        });
    }

}

export interface MiddlewareDependencies extends InstanceWrapper<Middleware> {
    forRoutes: (Route | RouteProps)[];
}
