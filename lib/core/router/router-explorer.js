"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const unknown_request_mapping_exception_1 = require("../errors/exceptions/unknown-request-mapping.exception");
const shared_utils_1 = require("@nestjs/common/utils/shared.utils");
const router_method_factory_1 = require("../helpers/router-method-factory");
const constants_1 = require("@nestjs/common/constants");
const logger_service_1 = require("@nestjs/common/services/logger.service");
const messages_1 = require("../helpers/messages");
const router_execution_context_1 = require("./router-execution-context");
const route_params_factory_1 = require("./route-params-factory");
const pipes_context_creator_1 = require("./../pipes/pipes-context-creator");
const pipes_consumer_1 = require("./../pipes/pipes-consumer");
const guards_context_creator_1 = require("../guards/guards-context-creator");
const guards_consumer_1 = require("../guards/guards-consumer");
const interceptors_context_creator_1 = require("../interceptors/interceptors-context-creator");
const interceptors_consumer_1 = require("../interceptors/interceptors-consumer");
class ExpressRouterExplorer {
    constructor(metadataScanner, routerProxy, expressAdapter, exceptionsFilter, config, container) {
        this.metadataScanner = metadataScanner;
        this.routerProxy = routerProxy;
        this.expressAdapter = expressAdapter;
        this.exceptionsFilter = exceptionsFilter;
        this.config = config;
        this.routerMethodFactory = new router_method_factory_1.RouterMethodFactory();
        this.logger = new logger_service_1.Logger('RouterExplorer', true);
        this.executionContextCreator = new router_execution_context_1.RouterExecutionContext(new route_params_factory_1.RouteParamsFactory(), new pipes_context_creator_1.PipesContextCreator(config), new pipes_consumer_1.PipesConsumer(), new guards_context_creator_1.GuardsContextCreator(container, config), new guards_consumer_1.GuardsConsumer(), new interceptors_context_creator_1.InterceptorsContextCreator(container, config), new interceptors_consumer_1.InterceptorsConsumer());
    }
    explore(instance, metatype, module) {
        const router = this.expressAdapter.createRouter();
        const routerPaths = this.scanForPaths(instance);
        this.applyPathsToRouterProxy(router, routerPaths, instance, module);
        return router;
    }
    fetchRouterPath(metatype) {
        const path = Reflect.getMetadata(constants_1.PATH_METADATA, metatype);
        return this.validateRoutePath(path);
    }
    validateRoutePath(path) {
        if (shared_utils_1.isUndefined(path)) {
            throw new unknown_request_mapping_exception_1.UnknownRequestMappingException();
        }
        return shared_utils_1.validatePath(path);
    }
    scanForPaths(instance, prototype) {
        const instancePrototype = shared_utils_1.isUndefined(prototype)
            ? Object.getPrototypeOf(instance)
            : prototype;
        return this.metadataScanner.scanFromPrototype(instance, instancePrototype, method => this.exploreMethodMetadata(instance, instancePrototype, method));
    }
    exploreMethodMetadata(instance, instancePrototype, methodName) {
        const targetCallback = instancePrototype[methodName];
        const routePath = Reflect.getMetadata(constants_1.PATH_METADATA, targetCallback);
        if (shared_utils_1.isUndefined(routePath)) {
            return null;
        }
        const requestMethod = Reflect.getMetadata(constants_1.METHOD_METADATA, targetCallback);
        return {
            path: this.validateRoutePath(routePath),
            requestMethod,
            targetCallback,
            methodName,
        };
    }
    applyPathsToRouterProxy(router, routePaths, instance, module) {
        (routePaths || []).map(pathProperties => {
            const { path, requestMethod } = pathProperties;
            this.applyCallbackToRouter(router, pathProperties, instance, module);
            this.logger.log(messages_1.RouteMappedMessage(path, requestMethod));
        });
    }
    applyCallbackToRouter(router, pathProperties, instance, module) {
        const { path, requestMethod, targetCallback, methodName } = pathProperties;
        const routerMethod = this.routerMethodFactory
            .get(router, requestMethod)
            .bind(router);
        const proxy = this.createCallbackProxy(instance, targetCallback, methodName, module, requestMethod);
        routerMethod(path, proxy);
    }
    createCallbackProxy(instance, callback, methodName, module, requestMethod) {
        const executionContext = this.executionContextCreator.create(instance, callback, methodName, module, requestMethod);
        const exceptionFilter = this.exceptionsFilter.create(instance, callback);
        return this.routerProxy.createProxy(executionContext, exceptionFilter);
    }
}
exports.ExpressRouterExplorer = ExpressRouterExplorer;
