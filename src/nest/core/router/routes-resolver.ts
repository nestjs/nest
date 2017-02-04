import { Application } from "express";
import { Route } from "./.";
import { NestContainer, InstanceWrapper } from "../container";
import { RouterBuilder } from "./router-builder";

export class NestRoutesResolver {
    private routerBuilder: RouterBuilder;

    constructor(
        private container: NestContainer,
        private routerFactory: Function) {

        this.routerBuilder = new RouterBuilder(routerFactory);
    }

    resolve(expressInstance: Application) {
        const modules = this.container.getModules();

        modules.forEach((module) => {
            this.setupRouters(module.routes, expressInstance);
        });
    }

    private setupRouters(routes: Map<Route, InstanceWrapper<Route>>, expressInstance: Application) {
        routes.forEach(({ instance }, routePrototype: Function) => {
            const { path, router } = this.routerBuilder.build(instance, routePrototype);

            expressInstance.use(path, router);
        });
    }
}