import { MiddlewareConfiguration } from '@nestjs/common/interfaces/middlewares/middleware-configuration.interface';
import { MiddlewaresConsumer } from '@nestjs/common/interfaces';
import { MiddlewareConfigProxy } from '@nestjs/common/interfaces/middlewares';
import { RoutesMapper } from './routes-mapper';
export declare class MiddlewareBuilder implements MiddlewaresConsumer {
    private readonly routesMapper;
    private readonly middlewaresCollection;
    private readonly logger;
    constructor(routesMapper: RoutesMapper);
    apply(middlewares: any | any[]): MiddlewareConfigProxy;
    /**
     * @deprecated
     * Since version RC.6 this method is deprecated. Use apply() instead.
     */
    use(configuration: MiddlewareConfiguration): this;
    build(): MiddlewareConfiguration[];
    private bindValuesToResolve(middlewares, resolveParams);
    private static ConfigProxy;
}
