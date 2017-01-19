import "reflect-metadata";
import { Router, RequestHandler, ErrorRequestHandler } from "express";
import { Route } from "./interfaces";
import { RequestMethod } from "./enums";

export class RouterBuilder {

    constructor(private routerFactory: Function) {}

    public build(instance: Route, routePrototype: Function) {
        const router = this.routerFactory();
        const path = this.fetchRouterPath(routePrototype);
        const routerPaths = this.scanForPaths(instance);

        this.applyPathsToRouter(router, routerPaths);

        return { path, router }
    }

    private fetchRouterPath(routePrototype) {
        const path = Reflect.getMetadata("path", routePrototype);
        return this.validateRoutePath(path);
    }

    private validateRoutePath(routePath: string): string {
        if(!routePath) {
            throw new Error("RequestMapping not defined in @RequestMapping() annotation!");
        }
        return (routePath.charAt(0) !== '/') ? '/' + routePath : routePath;
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
        const method: RequestHandler | ErrorRequestHandler = instancePrototype[methodName];

        let routePath: string = Reflect.getMetadata("path", method);
        if(!routePath) {
            return null;
        }
        routePath = this.validateRoutePath(routePath);

        const requestMethod: RequestMethod = Reflect.getMetadata("method", method);
        return {
            path: routePath,
            requestMethod,
            func: (<Function>method).bind(instance),
        };
    }

    private applyPathsToRouter(router: Router, routePaths: RoutePathProperties[]) {
        (routePaths || []).map((pathProperties) => {
            this.bindMethodToRouter(router, pathProperties);
        });
    }

    private bindMethodToRouter(router: Router, pathProperties: RoutePathProperties) {
        const { path, requestMethod, func } = pathProperties;

        const routerMethod = this.retrieveRouterMethod(router, requestMethod);
        routerMethod(path, func);
    }

    private retrieveRouterMethod(router: Router, requestMethod: RequestMethod) {
        switch(requestMethod) {
            case RequestMethod.POST: {
                return router.post.bind(router);
            }
            default: {
                return router.get.bind(router);
            }
        }
    }

}

interface RoutePathProperties {
    path: string,
    requestMethod: RequestMethod,
    func: RequestHandler | ErrorRequestHandler | any,
}