import { MiddlewareConfiguration } from '@nestjs/common/interfaces/middleware/middleware-configuration.interface';
import { Type, MiddlewareConsumer } from '@nestjs/common/interfaces';
import { MiddlewareConfigProxy } from '@nestjs/common/interfaces/middleware';
import { RoutesMapper } from './routes-mapper';
export declare class MiddlewareBuilder implements MiddlewareConsumer {
    private readonly routesMapper;
    private readonly middlewareCollection;
    private readonly logger;
    constructor(routesMapper: RoutesMapper);
    apply(...middleware: Array<Type<any> | Function | any>): MiddlewareConfigProxy;
    build(): MiddlewareConfiguration[];
    private bindValuesToResolve(middleware, resolveParams);
    private static ConfigProxy;
}
