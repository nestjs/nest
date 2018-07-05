import { MiddlewareConsumer, Type } from '@nestjs/common/interfaces';
import { MiddlewareConfigProxy } from '@nestjs/common/interfaces/middleware';
import { MiddlewareConfiguration } from '@nestjs/common/interfaces/middleware/middleware-configuration.interface';
import { RoutesMapper } from './routes-mapper';
export declare class MiddlewareBuilder implements MiddlewareConsumer {
    private readonly routesMapper;
    private readonly middlewareCollection;
    constructor(routesMapper: RoutesMapper);
    apply(...middleware: Array<Type<any> | Function | any>): MiddlewareConfigProxy;
    build(): MiddlewareConfiguration<any>[];
    private bindValuesToResolve(middleware, resolveParams);
    private static ConfigProxy;
}
