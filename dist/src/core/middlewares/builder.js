"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const invalid_middleware_configuration_exception_1 = require("../errors/exceptions/invalid-middleware-configuration.exception");
const shared_utils_1 = require("@nestjs/common/utils/shared.utils");
const bind_resolve_values_util_1 = require("@nestjs/common/utils/bind-resolve-values.util");
const logger_service_1 = require("@nestjs/common/services/logger.service");
class MiddlewareBuilder {
    constructor(routesMapper) {
        this.routesMapper = routesMapper;
        this.middlewaresCollection = new Set();
        this.logger = new logger_service_1.Logger(MiddlewareBuilder.name);
    }
    apply(middlewares) {
        return new MiddlewareBuilder.ConfigProxy(this, middlewares);
    }
    use(configuration) {
        this.logger.warn('DEPRECATED! Since version RC.6 `use()` method is deprecated. Use `apply()` instead.');
        const { middlewares, forRoutes } = configuration;
        if (shared_utils_1.isUndefined(middlewares) || shared_utils_1.isUndefined(forRoutes)) {
            throw new invalid_middleware_configuration_exception_1.InvalidMiddlewareConfigurationException();
        }
        this.middlewaresCollection.add(configuration);
        return this;
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
        this.middlewares = middlewares;
        this.contextArgs = null;
        this.includedRoutes = [].concat(middlewares).map((x) => {
            console.log(typeof x);
        });
    }
    with(...args) {
        this.contextArgs = args;
        return this;
    }
    forRoutes(...routes) {
        const { middlewaresCollection, bindValuesToResolve, routesMapper } = this.builder;
        const forRoutes = this.mapRoutesToFlatList(routes.map((route) => routesMapper.mapRouteToRouteProps(route)));
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
//# sourceMappingURL=builder.js.map