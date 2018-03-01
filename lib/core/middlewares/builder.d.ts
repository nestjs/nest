import { MiddlewareConfiguration } from '@nestjs/common/interfaces/middlewares/middleware-configuration.interface';
import { Type, MiddlewaresConsumer } from '@nestjs/common/interfaces';
import { MiddlewareConfigProxy } from '@nestjs/common/interfaces/middlewares';
import { RoutesMapper } from './routes-mapper';
export declare class MiddlewareBuilder implements MiddlewaresConsumer {
    private readonly routesMapper;
    private readonly middlewaresCollection;
    private readonly logger;
    constructor(routesMapper: RoutesMapper);
    apply(...middlewares: Array<Type<any> | Function | any>): MiddlewareConfigProxy;
    build(): MiddlewareConfiguration[];
    private bindValuesToResolve(middlewares, resolveParams);
    private static ConfigProxy;
}
