import { MiddlewareConfigProxy } from './middleware-config-proxy.interface';

export interface MiddlewaresConsumer {
     apply(middlewares: any | any[]): MiddlewareConfigProxy;
}