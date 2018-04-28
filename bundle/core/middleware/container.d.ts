import { MiddlewareConfiguration } from '@nestjs/common/interfaces/middleware/middleware-configuration.interface';
import { NestMiddleware } from '@nestjs/common/interfaces/middleware/nest-middleware.interface';
import { Type } from '@nestjs/common/interfaces/type.interface';
export declare class MiddlewareContainer {
    private readonly middleware;
    private readonly configurationSets;
    getMiddleware(module: string): Map<string, MiddlewareWrapper>;
    getConfigs(): Map<string, Set<MiddlewareConfiguration>>;
    addConfig(configList: MiddlewareConfiguration[], module: string): void;
    private getCurrentMiddleware(module);
    private getCurrentConfig(module);
}
export interface MiddlewareWrapper {
    instance: NestMiddleware;
    metatype: Type<NestMiddleware>;
}
