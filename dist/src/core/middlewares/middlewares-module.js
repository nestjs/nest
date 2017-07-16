"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const builder_1 = require("./builder");
const container_1 = require("./container");
const resolver_1 = require("./resolver");
const invalid_middleware_exception_1 = require("../errors/exceptions/invalid-middleware.exception");
const routes_mapper_1 = require("./routes-mapper");
const router_proxy_1 = require("../router/router-proxy");
const router_method_factory_1 = require("../helpers/router-method-factory");
const runtime_exception_1 = require("../errors/exceptions/runtime.exception");
const shared_utils_1 = require("@nestjs/common/utils/shared.utils");
const router_exception_filters_1 = require("./../router/router-exception-filters");
class MiddlewaresModule {
    static setup(container, config) {
        return __awaiter(this, void 0, void 0, function* () {
            this.routerExceptionFilter = new router_exception_filters_1.RouterExceptionFilters(config);
            this.resolver = new resolver_1.MiddlewaresResolver(this.container);
            const modules = container.getModules();
            yield this.resolveMiddlewares(modules);
        });
    }
    static getContainer() {
        return this.container;
    }
    static resolveMiddlewares(modules) {
        return __awaiter(this, void 0, void 0, function* () {
            yield Promise.all([...modules.entries()].map(([name, module]) => __awaiter(this, void 0, void 0, function* () {
                const instance = module.instance;
                this.loadConfiguration(instance, name);
                yield this.resolver.resolveInstances(module, name);
            })));
        });
    }
    static loadConfiguration(instance, module) {
        if (!instance.configure)
            return;
        const middlewaresBuilder = new builder_1.MiddlewareBuilder(this.routesMapper);
        instance.configure(middlewaresBuilder);
        if (!(middlewaresBuilder instanceof builder_1.MiddlewareBuilder))
            return;
        const config = middlewaresBuilder.build();
        this.container.addConfig(config, module);
    }
    static setupMiddlewares(app) {
        const configs = this.container.getConfigs();
        configs.forEach((moduleConfigs, module) => {
            [...moduleConfigs].forEach((config) => {
                this.setupMiddlewareConfig(config, module, app);
            });
        });
    }
    static setupMiddlewareConfig(config, module, app) {
        const { forRoutes } = config;
        forRoutes.forEach((route) => {
            this.setupRouteMiddleware(route, config, module, app);
        });
    }
    static setupRouteMiddleware(route, config, module, app) {
        const { path, method } = route;
        const middlewares = [].concat(config.middlewares);
        middlewares.map((metatype) => {
            const collection = this.container.getMiddlewares(module);
            const middleware = collection.get(metatype.name);
            if (shared_utils_1.isUndefined(middleware)) {
                throw new runtime_exception_1.RuntimeException();
            }
            const { instance } = middleware;
            this.setupHandler(instance, metatype, app, method, path);
        });
    }
    static setupHandler(instance, metatype, app, method, path) {
        if (shared_utils_1.isUndefined(instance.resolve)) {
            throw new invalid_middleware_exception_1.InvalidMiddlewareException(metatype.name);
        }
        const exceptionsHandler = this.routerExceptionFilter.create(instance, instance.resolve);
        const router = this.routerMethodFactory.get(app, method).bind(app);
        const setupWithProxy = (middleware) => this.setupHandlerWithProxy(exceptionsHandler, router, middleware, path);
        const resolve = instance.resolve();
        if (!(resolve instanceof Promise)) {
            setupWithProxy(resolve);
            return;
        }
        resolve.then((middleware) => setupWithProxy(middleware));
    }
    static setupHandlerWithProxy(exceptionsHandler, router, middleware, path) {
        const proxy = this.routerProxy.createProxy(middleware, exceptionsHandler);
        router(path, proxy);
    }
}
MiddlewaresModule.routesMapper = new routes_mapper_1.RoutesMapper();
MiddlewaresModule.container = new container_1.MiddlewaresContainer();
MiddlewaresModule.routerProxy = new router_proxy_1.RouterProxy();
MiddlewaresModule.routerMethodFactory = new router_method_factory_1.RouterMethodFactory();
exports.MiddlewaresModule = MiddlewaresModule;
//# sourceMappingURL=middlewares-module.js.map