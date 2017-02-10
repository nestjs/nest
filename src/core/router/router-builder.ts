import "reflect-metadata";
import { Controller } from "../../common/interfaces/controller.interface";
import { RequestMethod } from "../../common/enums/request-method.enum";
import { RouterProxy, RouterProxyCallback } from "./router-proxy";
import { UnkownRequestMappingException } from "../../errors/exceptions/unkown-request-mapping.exception";
import { ExpressAdapter } from "../adapters/express-adapter";

export class RouterBuilder {

    constructor(
        private routerProxy?: RouterProxy,
        private expressAdapter?: ExpressAdapter) {}

    public build(instance: Controller, routePrototype: Function) {
        const router = (<any>this.expressAdapter).createRouter();
        const path = this.fetchRouterPath(routePrototype);
        const routerPaths = this.scanForPaths(instance);

        this.applyPathsToRouterProxy(router, routerPaths);

        return { path, router };
    }

    scanForPaths(instance: Controller): RoutePathProperties[] {
        const instancePrototype = Object.getPrototypeOf(instance);
        return this.scanForPathsFromPrototype(instance, instancePrototype);
    }

    scanForPathsFromPrototype(instance: Controller, instancePrototype) {
        return Object.getOwnPropertyNames(instancePrototype)
            .filter((method) => method !== "constructor")
            .map((methodName) => this.exploreMethodMetadata(instance, instancePrototype, methodName))
            .filter((path) => path !== null);
    }

    exploreMethodMetadata(instance, instancePrototype, methodName: string): RoutePathProperties {
        const callbackMethod = instancePrototype[methodName];

        const routePath = Reflect.getMetadata("path", callbackMethod);
        if(typeof routePath === "undefined") {
            return null;
        }

        const requestMethod: RequestMethod = Reflect.getMetadata("method", callbackMethod);
        return {
            targetCallback: (<Function>callbackMethod).bind(instance),
            path: this.validateRoutePath(routePath),
            requestMethod,
        };
    }

    applyPathsToRouterProxy(router, routePaths: RoutePathProperties[]) {
        (routePaths || []).map((pathProperties) => {
            this.bindMethodToRouterProxy(router, pathProperties);
        });
    }

    private bindMethodToRouterProxy(router, pathProperties: RoutePathProperties) {
        const { path, requestMethod, targetCallback } = pathProperties;

        const routerMethod = this.findRouterMethod(router, requestMethod).bind(router);
        const proxy = this.routerProxy.createProxy(targetCallback);

        routerMethod(path, proxy);
    }

    private findRouterMethod(router, requestMethod: RequestMethod) {
        switch(requestMethod) {
            case RequestMethod.POST: { return router.post; }
            case RequestMethod.ALL: { return router.all; }
            case RequestMethod.DELETE: { return router.delete; }
            case RequestMethod.PUT: { return router.put; }
            default: {
                return router.get;
            }
        }
    }

    private fetchRouterPath(routePrototype: Function) {
        const path = Reflect.getMetadata("path", routePrototype);
        return this.validateRoutePath(path);
    }

    private validateRoutePath(routePath: string): string {
        if(typeof routePath === "undefined") {
            throw new UnkownRequestMappingException();
        }
        return (routePath.charAt(0) !== '/') ? '/' + routePath : routePath;
    }

}

export interface RoutePathProperties {
    path: string,
    requestMethod: RequestMethod,
    targetCallback: RouterProxyCallback,
}