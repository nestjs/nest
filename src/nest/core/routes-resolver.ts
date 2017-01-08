import { Express } from "express";
import { Route } from "./interfaces";
import { NestContainer, InstanceWrapper } from "./container";
import { RouterBuilder } from "./router-builder";

export class NestRoutesResolver {
    private routerBuilder: RouterBuilder;

    constructor(
        private container: NestContainer,
        private routerFactory: Function) {

        this.routerBuilder = new RouterBuilder(routerFactory);
    }

    resolve(expressInstance: Express) {
        const modules = this.container.getModules();

        modules.forEach((module) => {
            this.resolveRouters(module.routes, expressInstance);
        });
    }

    private resolveRouters(routes: Map<Route, InstanceWrapper<Route>>, expressInstance: Express) {
        routes.forEach(({ instance }, routePrototype: Function) => {
            const { path, router } = this.routerBuilder.build(instance, routePrototype);

            expressInstance.use(path, router);
        });
    }
}