import { MiddlewareConfigProxy } from './middleware-config-proxy.interface';
export interface MiddlewaresConsumer {
  /**
   * Takes single middleware class or array of classes
   * that subsequently could be attached to the passed either routes or controllers.
   *
   * @param  {any|any[]} middlewares
   * @returns MiddlewareConfigProxy
   */
  apply(middlewares: any | any[]): MiddlewareConfigProxy;
}
