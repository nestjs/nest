import 'reflect-metadata';
import { Controller } from '../../common/interfaces/controller.interface';
import { RequestMethod } from '../../common/enums/request-method.enum';
import { RouterProxy, RouterProxyCallback } from './router-proxy';
import { UnkownRequestMappingException } from '../../errors/exceptions/unkown-request-mapping.exception';
import { ExpressAdapter } from '../adapters/express-adapter';
import { Metatype } from '../../common/interfaces/metatype.interface';
import { isUndefined, validatePath } from '../../common/utils/shared.utils';
import { RouterMethodFactory } from '../helpers/router-method-factory';
import { PATH_METADATA, METHOD_METADATA } from '../../common/constants';
import { Logger } from '../../common/services/logger.service';
import { RouteMappedMessage } from '../helpers/messages';
import { RouterExecutionContext } from './router-execution-context';
import { ExceptionsFilter } from './interfaces/exceptions-filter.interface';
import { RouteParamsFactory } from './route-params-factory';
import { RouterExplorer } from './interfaces/explorer.inteface';
import { MetadataScanner } from '../metadata-scanner';

export class ExpressRouterExplorer implements RouterExplorer {
    private readonly executionContextCreator = new RouterExecutionContext(new RouteParamsFactory());
    private readonly routerMethodFactory = new RouterMethodFactory();
    private readonly logger = new Logger('RouterExplorer');

    constructor(
        private metadataScanner?: MetadataScanner,
        private routerProxy?: RouterProxy,
        private expressAdapter?: ExpressAdapter,
        private exceptionsFilter?: ExceptionsFilter) {}

    public explore(instance: Controller, metatype: Metatype<Controller>, moduleName: string) {
        const router = (this.expressAdapter as any).createRouter();
        const path = this.fetchRouterPath(metatype);
        const routerPaths = this.scanForPaths(instance);

        this.applyPathsToRouterProxy(router, routerPaths, instance, moduleName);
        return { path, router };
    }

    public scanForPaths(instance: Controller, prototype?): RoutePathProperties[] {
        const instancePrototype = isUndefined(prototype) ? Object.getPrototypeOf(instance) : prototype;
        return this.metadataScanner.scanFromPrototype<Controller, RoutePathProperties>(
            instance,
            instancePrototype,
            (method) => this.exploreMethodMetadata(instance, instancePrototype, method),
        );
    }

    public exploreMethodMetadata(instance: Controller, instancePrototype, methodName: string): RoutePathProperties {
        const targetCallback = instancePrototype[methodName];
        const routePath = Reflect.getMetadata(PATH_METADATA, targetCallback);
        if (isUndefined(routePath)) {
            return null;
        }

        const requestMethod: RequestMethod = Reflect.getMetadata(METHOD_METADATA, targetCallback);
        return {
            targetCallback,
            requestMethod,
            path: this.validateRoutePath(routePath),
        };
    }

    public applyPathsToRouterProxy(router, routePaths: RoutePathProperties[], instance: Controller, moduleName: string) {
        (routePaths || []).map((pathProperties) => {
            const { path, requestMethod } = pathProperties;
            this.applyCallbackToRouter(router, pathProperties, instance, moduleName);
            this.logger.log(RouteMappedMessage(path, requestMethod));
        });
    }

    private applyCallbackToRouter(router, pathProperties: RoutePathProperties, instance: Controller, moduleName: string) {
        const { path, requestMethod, targetCallback } = pathProperties;

        const routerMethod = this.routerMethodFactory.get(router, requestMethod).bind(router);
        const proxy = this.createCallbackProxy(instance, targetCallback, moduleName);
        routerMethod(path, proxy);
    }

    private createCallbackProxy(instance: Controller, callback: RoutePathProperties['targetCallback'], moduleName: string) {
        const executionContext = this.executionContextCreator.create(instance, callback);
        const exceptionFilter = this.exceptionsFilter.create(instance, moduleName);

        return this.routerProxy.createProxy(executionContext, exceptionFilter);
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
    path: string;
    requestMethod: RequestMethod;
    targetCallback: RouterProxyCallback;
}