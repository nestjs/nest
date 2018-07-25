"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const dependencies_decorator_1 = require("@nestjs/common/decorators/core/dependencies.decorator");
const bind_resolve_values_util_1 = require("@nestjs/common/utils/bind-resolve-values.util");
const shared_utils_1 = require("@nestjs/common/utils/shared.utils");
const utils_1 = require("./utils");
class MiddlewareBuilder {
    constructor(routesMapper) {
        this.routesMapper = routesMapper;
        this.middlewareCollection = new Set();
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
        this.excludedRoutes = [];
        this.includedRoutes = utils_1.filterMiddleware(middleware);
    }
    getExcludedRoutes() {
        return this.excludedRoutes;
    }
    with(...args) {
        this.contextParameters = args;
        return this;
    }
    exclude(...routes) {
        const { routesMapper } = this.builder;
        this.excludedRoutes = this.mapRoutesToFlatList(routes.map(route => routesMapper.mapRouteToRouteInfo(route)));
        return this;
    }
    forRoutes(...routes) {
        const { middlewareCollection, bindValuesToResolve, routesMapper, } = this.builder;
        const forRoutes = this.mapRoutesToFlatList(routes.map(route => routesMapper.mapRouteToRouteInfo(route)));
        const configuration = {
            middleware: bindValuesToResolve(this.includedRoutes, this.contextParameters),
            forRoutes: forRoutes.filter(route => !this.isRouteExcluded(route)),
        };
        middlewareCollection.add(configuration);
        return this.builder;
    }
    mapRoutesToFlatList(forRoutes) {
        return forRoutes.reduce((a, b) => a.concat(b));
    }
    isRouteExcluded(routeInfo) {
        const pathLastIndex = routeInfo.path.length - 1;
        const validatedRoutePath = routeInfo.path[pathLastIndex] === '/'
            ? routeInfo.path.slice(0, pathLastIndex)
            : routeInfo.path;
        return this.excludedRoutes.some(excluded => {
            const isPathEqual = validatedRoutePath === excluded.path;
            if (!isPathEqual) {
                return false;
            }
            return (routeInfo.method === excluded.method ||
                excluded.method === common_1.RequestMethod.ALL);
        });
    }
};
exports.MiddlewareBuilder = MiddlewareBuilder;
