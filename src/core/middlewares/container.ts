import { MiddlewareConfiguration } from "./interfaces/middleware-configuration.interface";
import { Middleware } from "./interfaces/middleware.interface";
import { MiddlewareProto } from "./interfaces/middleware-proto.interface";
import { RoutesMapper } from "./routes-mapper";
import { NestModule } from "../../common/interfaces/nest-module.interface";

export class MiddlewaresContainer {
    private readonly middlewares = new Map<NestModule, Map<MiddlewareProto, Middleware>>();
    private readonly configs = new Map<NestModule, Set<MiddlewareConfiguration>>();

    constructor(private routesMapper: RoutesMapper) {}

    getMiddlewares(module: NestModule): Map<MiddlewareProto, Middleware> {
        return this.middlewares.get(module) || new Map();
    }

    getConfigs(): Map<NestModule, Set<MiddlewareConfiguration>> {
        return this.configs;
    }

    addConfig(configList: MiddlewareConfiguration[], module: NestModule) {
        const currentMiddlewares = this.getCurrentMiddlewares(module);
        const currentConfig = this.getCurrentConfig(module);

        (configList || []).map((config) => {
            [].concat(config.middlewares).map(
                (middleware) => {
                    currentMiddlewares.set(middleware, null);
                }
            );

            config.forRoutes = this.mapRoutesToFlatList(config.forRoutes);
            currentConfig.add(config);
        });
    }

    private mapRoutesToFlatList(forRoutes) {
        return forRoutes.map((route) => (
            this.routesMapper.mapRouteToRouteProps(route)
        )).reduce((a, b) => a.concat(b));
    }

    private getCurrentMiddlewares(module: NestModule) {
        if (!this.middlewares.has(module)) {
            this.middlewares.set(module, new Map<MiddlewareProto, Middleware>());
        }
        return this.middlewares.get(module);
    }

    private getCurrentConfig(module: NestModule) {
        if (!this.configs.has(module)) {
            this.configs.set(module, new Set<MiddlewareConfiguration>());
        }
        return this.configs.get(module);
    }
}
