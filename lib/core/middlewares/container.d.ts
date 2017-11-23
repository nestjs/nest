import { MiddlewareConfiguration } from '@nestjs/common/interfaces/middlewares/middleware-configuration.interface';
import { NestMiddleware } from '@nestjs/common/interfaces/middlewares/nest-middleware.interface';
import { Metatype } from '@nestjs/common/interfaces/metatype.interface';
export declare class MiddlewaresContainer {
    private readonly middlewares;
    private readonly configs;
    getMiddlewares(module: string): Map<string, MiddlewareWrapper>;
    getConfigs(): Map<string, Set<MiddlewareConfiguration>>;
    addConfig(configList: MiddlewareConfiguration[], module: string): void;
    private getCurrentMiddlewares(module);
    private getCurrentConfig(module);
}
export interface MiddlewareWrapper {
    instance: NestMiddleware;
    metatype: Metatype<NestMiddleware>;
}
