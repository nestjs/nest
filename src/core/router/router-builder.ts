import 'reflect-metadata';
import { Controller } from '../../common/interfaces/controller.interface';
import { RequestMethod } from '../../common/enums/request-method.enum';
import { RouterProxy, RouterProxyCallback } from './router-proxy';
import { UnkownRequestMappingException } from '../../errors/exceptions/unkown-request-mapping.exception';
import { ExpressAdapter } from '../adapters/express-adapter';
import { Metatype } from '../../common/interfaces/metatype.interface';
import { isUndefined, isConstructor, validatePath, isFunction } from '../../common/utils/shared.utils';
import { RouterMethodFactory } from '../helpers/router-method-factory';
import { PATH_METADATA, METHOD_METADATA } from '../../common/constants';
import { Logger } from '../../common/services/logger.service';
import { getRouteMappedMessage } from '../helpers/messages';

export class RouterBuilder {
    private readonly routerMethodFactory = new RouterMethodFactory();
    private readonly logger = new Logger(RouterBuilder.name);

    constructor(
        private routerProxy?: RouterProxy,
        private expressAdapter?: ExpressAdapter) {}

    public build(instance: Controller, metatype: Metatype<Controller>) {
        const router = (<any>this.expressAdapter).createRouter();
        const path = this.fetchRouterPath(metatype);
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
            .filter((method) => {
                const descriptor = Object.getOwnPropertyDescriptor(instancePrototype, method);
                if (descriptor.set || descriptor.get) {
                    return false;
                }
                return !isConstructor(method) && isFunction(instancePrototype[method]);
            })
            .map((methodName) => this.exploreMethodMetadata(instance, instancePrototype, methodName))
            .filter((path) => path !== null);
    }

    exploreMethodMetadata(instance: Controller, instancePrototype, methodName: string): RoutePathProperties {
        const callbackMethod = instancePrototype[methodName];

        const routePath = Reflect.getMetadata(PATH_METADATA, callbackMethod);
        if (isUndefined(routePath)) {
            return null;
        }

        const requestMethod: RequestMethod = Reflect.getMetadata(METHOD_METADATA, callbackMethod);
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

        const routerMethod = this.routerMethodFactory.get(router, requestMethod).bind(router);
        const proxy = this.routerProxy.createProxy(targetCallback);
        routerMethod(path, proxy);

        this.logger.log(getRouteMappedMessage(path, requestMethod));
    }

    private fetchRouterPath(metatype: Metatype<Controller>) {
        const path = Reflect.getMetadata(PATH_METADATA, metatype);
        return this.validateRoutePath(path);
    }

    private validateRoutePath(path: string): string {
        if (isUndefined(path)) {
            throw new UnkownRequestMappingException();
        }
        return validatePath(path);
    }

}

export interface RoutePathProperties {
    path: string,
    requestMethod: RequestMethod,
    targetCallback: RouterProxyCallback,
}