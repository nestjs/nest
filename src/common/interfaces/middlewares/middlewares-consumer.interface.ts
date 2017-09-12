import { MiddlewareConfigProxy } from './middleware-config-proxy.interface';

export interface MiddlewaresConsumer {
     /**
      * Takes single middleware class or array of classes,
      * which subsequently can be attached to the passed routes / controllers.
      *
      * @param  {any|any[]} middlewares
      * @returns MiddlewareConfigProxy
      */
     apply(middlewares: any | any[]): MiddlewareConfigProxy;
}