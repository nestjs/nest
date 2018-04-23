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
const resolver_1 = require("./resolver");
const invalid_middleware_exception_1 = require("../errors/exceptions/invalid-middleware.exception");
const request_method_enum_1 = require("@nestjs/common/enums/request-method.enum");
const routes_mapper_1 = require("./routes-mapper");
const router_proxy_1 = require("../router/router-proxy");
const router_method_factory_1 = require("../helpers/router-method-factory");
const runtime_exception_1 = require("../errors/exceptions/runtime.exception");
const shared_utils_1 = require("@nestjs/common/utils/shared.utils");
const router_exception_filters_1 = require("./../router/router-exception-filters");
class MiddlewaresModule {
    constructor() {
        this.routerProxy = new router_proxy_1.RouterProxy();
        this.routerMethodFactory = new router_method_factory_1.RouterMethodFactory();
    }
    register(middlewaresContainer, container, config) {
        return __awaiter(this, void 0, void 0, function* () {
            const appRef = container.getApplicationRef();
            this.routerExceptionFilter = new router_exception_filters_1.RouterExceptionFilters(container, config, appRef);
            this.routesMapper = new routes_mapper_1.RoutesMapper(container);
            this.resolver = new resolver_1.MiddlewaresResolver(middlewaresContainer);
            const modules = container.getModules();
            yield this.resolveMiddlewares(middlewaresContainer, modules);
        });
    }
    resolveMiddlewares(middlewaresContainer, modules) {
        return __awaiter(this, void 0, void 0, function* () {
            yield Promise.all([...modules.entries()].map(([name, module]) => __awaiter(this, void 0, void 0, function* () {
                const instance = module.instance;
                this.loadConfiguration(middlewaresContainer, instance, name);
                yield this.resolver.resolveInstances(module, name);
            })));
        });
    }
    loadConfiguration(middlewaresContainer, instance, module) {
        if (!instance.configure)
            return;
        const middlewaresBuilder = new builder_1.MiddlewareBuilder(this.routesMapper);
        instance.configure(middlewaresBuilder);
        if (!(middlewaresBuilder instanceof builder_1.MiddlewareBuilder))
            return;
        const config = middlewaresBuilder.build();
        middlewaresContainer.addConfig(config, module);
    }
    registerMiddlewares(middlewaresContainer, app) {
        return __awaiter(this, void 0, void 0, function* () {
            const configs = middlewaresContainer.getConfigs();
            yield Promise.all([...configs.entries()].map(([module, moduleConfigs]) => __awaiter(this, void 0, void 0, function* () {
                yield Promise.all([...moduleConfigs].map((config) => __awaiter(this, void 0, void 0, function* () {
                    yield this.registerMiddlewareConfig(middlewaresContainer, config, module, app);
                })));
            })));
        });
    }
    registerMiddlewareConfig(middlewaresContainer, config, module, app) {
        return __awaiter(this, void 0, void 0, function* () {
            const { forRoutes } = config;
            yield Promise.all(forRoutes.map((routePath) => __awaiter(this, void 0, void 0, function* () {
                yield this.registerRouteMiddleware(middlewaresContainer, routePath, config, module, app);
            })));
        });
    }
    registerRouteMiddleware(middlewaresContainer, routePath, config, module, app) {
        return __awaiter(this, void 0, void 0, function* () {
            const middlewares = [].concat(config.middlewares);
            yield Promise.all(middlewares.map((metatype) => __awaiter(this, void 0, void 0, function* () {
                const collection = middlewaresContainer.getMiddlewares(module);
                const middleware = collection.get(metatype.name);
                if (shared_utils_1.isUndefined(middleware)) {
                    throw new runtime_exception_1.RuntimeException();
                }
                const { instance } = middleware;
                yield this.setupHandler(instance, metatype, app, request_method_enum_1.RequestMethod.ALL, routePath);
            })));
        });
    }
    setupHandler(instance, metatype, app, method, path) {
        return __awaiter(this, void 0, void 0, function* () {
            if (shared_utils_1.isUndefined(instance.resolve)) {
                throw new invalid_middleware_exception_1.InvalidMiddlewareException(metatype.name);
            }
            const exceptionsHandler = this.routerExceptionFilter.create(instance, instance.resolve, undefined);
            const router = this.routerMethodFactory.get(app, method).bind(app);
            const setupWithProxy = obj => this.setupHandlerWithProxy(exceptionsHandler, router, obj, path);
            const resolve = instance.resolve();
            if (!(resolve instanceof Promise)) {
                setupWithProxy(resolve);
                return;
            }
            const middleware = yield resolve;
            setupWithProxy(middleware);
        });
    }
    setupHandlerWithProxy(exceptionsHandler, router, middleware, path) {
        const proxy = this.routerProxy.createProxy(middleware, exceptionsHandler);
        router(path, proxy);
    }
}
exports.MiddlewaresModule = MiddlewaresModule;
