import { MiddlewaresConsumer } from './middlewares-consumer.interface';
import { RequestMappingMetadata } from './request-mapping-metadata.interface';

export interface MiddlewareConfigProxy {
    with: (...data) => MiddlewareConfigProxy;
    forRoutes: (...routes) => MiddlewaresConsumer;
}