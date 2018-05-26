"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const request_method_enum_1 = require("@nestjs/common/enums/request-method.enum");
const shared_utils_1 = require("@nestjs/common/utils/shared.utils");
const invalid_middleware_exception_1 = require("../errors/exceptions/invalid-middleware.exception");
const runtime_exception_1 = require("../errors/exceptions/runtime.exception");
const router_method_factory_1 = require("../helpers/router-method-factory");
const router_exception_filters_1 = require("../router/router-exception-filters");
const router_proxy_1 = require("../router/router-proxy");
const builder_1 = require("./builder");
const resolver_1 = require("./resolver");
const routes_mapper_1 = require("./routes-mapper");
class MiddlewareModule {
    constructor() {
        this.routerProxy = new router_proxy_1.RouterProxy();
        this.routerMethodFactory = new router_method_factory_1.RouterMethodFactory();
    }
    async register(middlewareContainer, container, config) {
        const appRef = container.getApplicationRef();
        this.routerExceptionFilter = new router_exception_filters_1.RouterExceptionFilters(container, config, appRef);
        this.routesMapper = new routes_mapper_1.RoutesMapper(container);
        this.resolver = new resolver_1.MiddlewareResolver(middlewareContainer);
        this.config = config;
        const modules = container.getModules();
        await this.resolveMiddleware(middlewareContainer, modules);
    }
    async resolveMiddleware(middlewareContainer, modules) {
        await Promise.all([...modules.entries()].map(async ([name, module]) => {
            const instance = module.instance;
            this.loadConfiguration(middlewareContainer, instance, name);
            await this.resolver.resolveInstances(module, name);
        }));
    }
    loadConfiguration(middlewareContainer, instance, module) {
        if (!instance.configure)
            return;
        const middlewareBuilder = new builder_1.MiddlewareBuilder(this.routesMapper);
        instance.configure(middlewareBuilder);
        if (!(middlewareBuilder instanceof builder_1.MiddlewareBuilder))
            return;
        const config = middlewareBuilder.build();
        middlewareContainer.addConfig(config, module);
    }
    async registerMiddleware(middlewareContainer, applicationRef) {
        const configs = middlewareContainer.getConfigs();
        const registerAllConfigs = (module, middlewareConfig) => middlewareConfig.map(async (config) => {
            await this.registerMiddlewareConfig(middlewareContainer, config, module, applicationRef);
        });
        await Promise.all([...configs.entries()].map(async ([module, moduleConfigs]) => {
            await Promise.all(registerAllConfigs(module, [...moduleConfigs]));
        }));
    }
    async registerMiddlewareConfig(middlewareContainer, config, module, applicationRef) {
        const { forRoutes } = config;
        await Promise.all(forRoutes.map(async (routePath) => {
            await this.registerRouteMiddleware(middlewareContainer, routePath, config, module, applicationRef);
        }));
    }
    async registerRouteMiddleware(middlewareContainer, routePath, config, module, applicationRef) {
        const middlewareCollection = [].concat(config.middleware);
        await Promise.all(middlewareCollection.map(async (metatype) => {
            const collection = middlewareContainer.getMiddleware(module);
            const middleware = collection.get(metatype.name);
            if (shared_utils_1.isUndefined(middleware)) {
                throw new runtime_exception_1.RuntimeException();
            }
            const { instance } = middleware;
            await this.bindHandler(instance, metatype, applicationRef, request_method_enum_1.RequestMethod.ALL, routePath);
        }));
    }
    async bindHandler(instance, metatype, applicationRef, method, path) {
        if (shared_utils_1.isUndefined(instance.resolve)) {
            throw new invalid_middleware_exception_1.InvalidMiddlewareException(metatype.name);
        }
        const exceptionsHandler = this.routerExceptionFilter.create(instance, instance.resolve, undefined);
        const router = this.routerMethodFactory
            .get(applicationRef, method)
            .bind(applicationRef);
        const bindWithProxy = obj => this.bindHandlerWithProxy(exceptionsHandler, router, obj, path);
        const resolve = instance.resolve();
        if (!(resolve instanceof Promise)) {
            bindWithProxy(resolve);
            return;
        }
        const middleware = await resolve;
        bindWithProxy(middleware);
    }
    bindHandlerWithProxy(exceptionsHandler, router, middleware, path) {
        const proxy = this.routerProxy.createProxy(middleware, exceptionsHandler);
        const prefix = this.config.getGlobalPrefix();
        const basePath = prefix ? shared_utils_1.validatePath(prefix) : '';
        router(basePath + path, proxy);
    }
}
exports.MiddlewareModule = MiddlewareModule;
