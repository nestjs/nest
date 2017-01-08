import "reflect-metadata";
import * as express from "express";
import { Route } from "./interfaces";
import { RequestMethod } from "./enums";

export class RouterBuilder {

    constructor(private routerFactory: Function) {}

    public build(instance: Route, routePrototype: Function) {
        const router = this.routerFactory();

        let path = Reflect.getMetadata("path", routePrototype);
        path = this.validateRoutePath(path);

        const routePaths = this.scanForPaths(instance);
        this.applyPathsToRouter(router, routePaths);

        return { path, router }
    }

    private validateRoutePath(path: string): string {
        if(!path)
            throw new Error("Path not defined in @Path() annotation!");

        if(path.charAt(0) !== '/') {
            return '/' + path;
        }
        return path;
    }

    private scanForPaths(instance: Route): RoutePathProperties[] {
        const routePathsProperties: RoutePathProperties[] = [];

        const instancePrototype = Object.getPrototypeOf(instance);
        const methodsList = Object.getOwnPropertyNames(instancePrototype)
            .filter((method) => method !== "constructor");

        for (const methodName of methodsList) {
            const routePath = this.exploreMethodMetadata(instance, instancePrototype, methodName);
            if(routePath) {
                routePathsProperties.push(routePath);
            }
        }

        return routePathsProperties;
    }

    private exploreMethodMetadata(instance, instancePrototype, methodName): RoutePathProperties {
        let method: express.RequestHandler | express.ErrorRequestHandler;
        method = instancePrototype[methodName];

        let path: string = Reflect.getMetadata("path", method);
        if(!path) {
            return;
        }

        path = this.validateRoutePath(path);
        const requestMethod: RequestMethod = Reflect.getMetadata("requestMethod", method);
        return {
            path,
            requestMethod,
            func: (method as Function).bind(instance),
        };
    }

    private applyPathsToRouter(router: express.Router, routePaths: RoutePathProperties[]) {
        (routePaths || []).map((pathProperties) => {
            const { path, requestMethod, func } = pathProperties;

            switch(requestMethod) {
                case RequestMethod.GET: {
                    router.get(path, func);
                    break;
                }
            }
        });
    }

}

interface RoutePathProperties {
    path: string,
    requestMethod: RequestMethod,
    func: express.RequestHandler | express.ErrorRequestHandler,
}