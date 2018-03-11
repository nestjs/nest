"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const router_proxy_1 = require("./router-proxy");
const logger_service_1 = require("@nestjs/common/services/logger.service");
const messages_1 = require("../helpers/messages");
const router_exception_filters_1 = require("./router-exception-filters");
const metadata_scanner_1 = require("../metadata-scanner");
const router_explorer_1 = require("./router-explorer");
const common_1 = require("@nestjs/common");
const constants_1 = require("@nestjs/common/constants");
class RoutesResolver {
    constructor(container, expressAdapter, config) {
        this.container = container;
        this.expressAdapter = expressAdapter;
        this.config = config;
        this.logger = new logger_service_1.Logger(RoutesResolver.name, true);
        this.routerProxy = new router_proxy_1.RouterProxy();
        this.routerExceptionsFilter = new router_exception_filters_1.RouterExceptionFilters(config);
        this.routerBuilder = new router_explorer_1.ExpressRouterExplorer(new metadata_scanner_1.MetadataScanner(), this.routerProxy, expressAdapter, this.routerExceptionsFilter, config, this.container);
    }
    resolve(router, express) {
        const modules = this.container.getModules();
        modules.forEach(({ routes, metatype }, moduleName) => {
            const path = metatype
                ? Reflect.getMetadata(constants_1.MODULE_PATH, metatype)
                : undefined;
            this.setupRouters(routes, moduleName, path, router);
        });
        this.setupNotFoundHandler(router);
        this.setupExceptionHandler(router);
        this.setupExceptionHandler(express);
    }
    setupRouters(routes, moduleName, modulePath, express) {
        routes.forEach(({ instance, metatype }) => {
            const path = this.routerBuilder.fetchRouterPath(metatype, modulePath);
            const controllerName = metatype.name;
            this.logger.log(messages_1.ControllerMappingMessage(controllerName, path));
            const router = this.routerBuilder.explore(instance, metatype, moduleName);
            express.use(path, router);
        });
    }
    setupNotFoundHandler(express) {
        const callback = (req, res) => {
            throw new common_1.NotFoundException(`Cannot ${req.method} ${req.url}`);
        };
        const exceptionHandler = this.routerExceptionsFilter.create({}, callback);
        const proxy = this.routerProxy.createProxy(callback, exceptionHandler);
        express.use(proxy);
    }
    setupExceptionHandler(express) {
        const callback = (err, req, res, next) => {
            throw this.mapExternalException(err);
        };
        const exceptionHandler = this.routerExceptionsFilter.create({}, callback);
        const proxy = this.routerProxy.createExceptionLayerProxy(callback, exceptionHandler);
        express.use(proxy);
    }
    mapExternalException(err) {
        switch (true) {
            case err instanceof SyntaxError:
                return new common_1.BadRequestException(err.message);
            default:
                return err;
        }
    }
}
exports.RoutesResolver = RoutesResolver;
