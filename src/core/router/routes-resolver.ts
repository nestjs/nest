import { Application } from "express";
import { NestContainer, InstanceWrapper } from "../injector/container";
import { RouterBuilder } from "./router-builder";
import { RouterProxy } from "./router-proxy";
import { ExceptionsHandler } from "../exceptions/exceptions-handler";
import { Controller } from "../../common/interfaces/controller.interface";

export class RoutesResolver {
    private readonly routerProxy = new RouterProxy(new ExceptionsHandler());
    private routerBuilder: RouterBuilder;

    constructor(private container: NestContainer, expressAdapter) {
        this.routerBuilder = new RouterBuilder(this.routerProxy, expressAdapter);
    }

    resolve(expressInstance: Application) {
        const modules = this.container.getModules();
        modules.forEach(({ routes }) => this.setupRouters(routes, expressInstance));
    }

    setupRouters(
        routes: Map<Controller, InstanceWrapper<Controller>>,
        expressInstance: Application) {

        routes.forEach(({ instance }, routePrototype: Function) => {
            const { path, router } = this.routerBuilder.build(instance, routePrototype);

            expressInstance.use(path, router);
        });
    }
}