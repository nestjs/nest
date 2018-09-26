"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const constants_1 = require("@nestjs/common/constants");
const logger_service_1 = require("@nestjs/common/services/logger.service");
const messages_1 = require("../helpers/messages");
const metadata_scanner_1 = require("../metadata-scanner");
const router_exception_filters_1 = require("./router-exception-filters");
const router_explorer_1 = require("./router-explorer");
const router_proxy_1 = require("./router-proxy");
class RoutesResolver {
    constructor(container, config) {
        this.container = container;
        this.config = config;
        this.logger = new logger_service_1.Logger(RoutesResolver.name, true);
        this.routerProxy = new router_proxy_1.RouterProxy();
        this.routerExceptionsFilter = new router_exception_filters_1.RouterExceptionFilters(container, config, container.getApplicationRef());
        this.routerBuilder = new router_explorer_1.RouterExplorer(new metadata_scanner_1.MetadataScanner(), this.container, this.routerProxy, this.routerExceptionsFilter, this.config);
    }
    resolve(appInstance, basePath) {
        const modules = this.container.getModules();
        modules.forEach(({ routes, metatype }, moduleName) => {
            let path = metatype
                ? Reflect.getMetadata(constants_1.MODULE_PATH, metatype)
                : undefined;
            path = path ? path + basePath : basePath;
            this.registerRouters(routes, moduleName, path, appInstance);
        });
    }
    registerRouters(routes, moduleName, basePath, appInstance) {
        routes.forEach(({ instance, metatype }) => {
            const path = this.routerBuilder.extractRouterPath(metatype, basePath);
            const controllerName = metatype.name;
            this.logger.log(messages_1.CONTROLLER_MAPPING_MESSAGE(controllerName, path));
            this.routerBuilder.explore(instance, metatype, moduleName, appInstance, path);
        });
    }
    registerNotFoundHandler() {
        const applicationRef = this.container.getApplicationRef();
        const callback = (req, res) => {
            const method = applicationRef.getRequestMethod(req);
            const url = applicationRef.getRequestUrl(req);
            throw new common_1.NotFoundException(`Cannot ${method} ${url}`);
        };
        const handler = this.routerExceptionsFilter.create({}, callback, undefined);
        const proxy = this.routerProxy.createProxy(callback, handler);
        applicationRef.setNotFoundHandler &&
            applicationRef.setNotFoundHandler(proxy);
    }
    registerExceptionHandler() {
        const callback = (err, req, res, next) => {
            throw this.mapExternalException(err);
        };
        const handler = this.routerExceptionsFilter.create({}, callback, undefined);
        const proxy = this.routerProxy.createExceptionLayerProxy(callback, handler);
        const applicationRef = this.container.getApplicationRef();
        applicationRef.setErrorHandler && applicationRef.setErrorHandler(proxy);
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
