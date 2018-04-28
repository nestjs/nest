"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const shared_utils_1 = require("@nestjs/common/utils/shared.utils");
const bind_resolve_values_util_1 = require("@nestjs/common/utils/bind-resolve-values.util");
const logger_service_1 = require("@nestjs/common/services/logger.service");
const utils_1 = require("./utils");
const dependencies_decorator_1 = require("@nestjs/common/decorators/core/dependencies.decorator");
class MiddlewareBuilder {
    constructor(routesMapper) {
        this.routesMapper = routesMapper;
        this.middlewareCollection = new Set();
        this.logger = new logger_service_1.Logger(MiddlewareBuilder.name);
    }
    apply(...middleware) {
        return new MiddlewareBuilder.ConfigProxy(this, dependencies_decorator_1.flatten(middleware));
    }
    build() {
        return [...this.middlewareCollection];
    }
    bindValuesToResolve(middleware, resolveParams) {
        if (shared_utils_1.isNil(resolveParams)) {
            return middleware;
        }
        const bindArgs = bind_resolve_values_util_1.BindResolveMiddlewareValues(resolveParams);
        return [].concat(middleware).map(bindArgs);
    }
}
MiddlewareBuilder.ConfigProxy = class {
    constructor(builder, middleware) {
        this.builder = builder;
        this.contextParameters = null;
        this.includedRoutes = utils_1.filterMiddleware(middleware);
    }
    with(...args) {
        this.contextParameters = args;
        return this;
    }
    forRoutes(...routes) {
        const { middlewareCollection, bindValuesToResolve, routesMapper, } = this.builder;
        const forRoutes = this.mapRoutesToFlatList(routes.map(route => routesMapper.mapRouteToRouteProps(route)));
        const configuration = {
            middleware: bindValuesToResolve(this.includedRoutes, this.contextParameters),
            forRoutes,
        };
        middlewareCollection.add(configuration);
        return this.builder;
    }
    mapRoutesToFlatList(forRoutes) {
        return forRoutes.reduce((a, b) => a.concat(b));
    }
};
exports.MiddlewareBuilder = MiddlewareBuilder;
