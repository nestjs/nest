import { MiddlewareConfiguration } from './interfaces/middleware-configuration.interface';
import { NestMiddleware } from './interfaces/nest-middleware.interface';
import { RoutesMapper } from './routes-mapper';
import { Metatype } from '../../common/interfaces/metatype.interface';

export class MiddlewaresContainer {
    private readonly middlewares = new Map<string, Map<string, MiddlewareWrapper>>();
    private readonly configs = new Map<string, Set<MiddlewareConfiguration>>();

    constructor(private routesMapper: RoutesMapper) {}

    getMiddlewares(module: string): Map<string, MiddlewareWrapper> {
        return this.middlewares.get(module) || new Map();
    }

    getConfigs(): Map<string, Set<MiddlewareConfiguration>> {
        return this.configs;
    }

    addConfig(configList: MiddlewareConfiguration[], module: string) {
        const currentMiddlewares = this.getCurrentMiddlewares(module);
        const currentConfig = this.getCurrentConfig(module);

        (configList || []).map((config) => {
            [].concat(config.middlewares).map((metatype) => {
                currentMiddlewares.set(metatype.name, {
                    instance: null,
                    metatype
                });
            });

            config.forRoutes = this.mapRoutesToFlatList(config.forRoutes);
            currentConfig.add(config);
        });
    }

    private mapRoutesToFlatList(forRoutes) {
        return forRoutes.map((route) => (
            this.routesMapper.mapRouteToRouteProps(route)
        )).reduce((a, b) => a.concat(b));
    }

    private getCurrentMiddlewares(module: string) {
        if (!this.middlewares.has(module)) {
            this.middlewares.set(module, new Map<string, MiddlewareWrapper>());
        }
        return this.middlewares.get(module);
    }

    private getCurrentConfig(module: string) {
        if (!this.configs.has(module)) {
            this.configs.set(module, new Set<MiddlewareConfiguration>());
        }
        return this.configs.get(module);
    }
}

export interface MiddlewareWrapper {
    instance: NestMiddleware,
    metatype: Metatype<NestMiddleware>
}