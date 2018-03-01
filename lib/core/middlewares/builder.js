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
        this.middlewaresCollection = new Set();
        this.logger = new logger_service_1.Logger(MiddlewareBuilder.name);
    }
    apply(...middlewares) {
        return new MiddlewareBuilder.ConfigProxy(this, dependencies_decorator_1.flatten(middlewares));
    }
    build() {
        return [...this.middlewaresCollection];
    }
    bindValuesToResolve(middlewares, resolveParams) {
        if (shared_utils_1.isNil(resolveParams)) {
            return middlewares;
        }
        const bindArgs = bind_resolve_values_util_1.BindResolveMiddlewareValues(resolveParams);
        return [].concat(middlewares).map(bindArgs);
    }
}
MiddlewareBuilder.ConfigProxy = class {
    constructor(builder, middlewares) {
        this.builder = builder;
        this.contextArgs = null;
        this.includedRoutes = utils_1.filterMiddlewares(middlewares);
    }
    with(...args) {
        this.contextArgs = args;
        return this;
    }
    forRoutes(...routes) {
        const { middlewaresCollection, bindValuesToResolve, routesMapper, } = this.builder;
        const forRoutes = this.mapRoutesToFlatList(routes.map(route => routesMapper.mapRouteToRouteProps(route)));
        const configuration = {
            middlewares: bindValuesToResolve(this.includedRoutes, this.contextArgs),
            forRoutes,
        };
        middlewaresCollection.add(configuration);
        return this.builder;
    }
    mapRoutesToFlatList(forRoutes) {
        return forRoutes.reduce((a, b) => a.concat(b));
    }
};
exports.MiddlewareBuilder = MiddlewareBuilder;
