import { MiddlewareConfigProxy } from './middleware-config-proxy.interface';

export interface MiddlewareConsumer {
  /**
   * Takes single middleware class or array of classes
   * that subsequently could be attached to the passed either routes or controllers.
   *
   * @param  {any|any[]} middleware
   * @returns {MiddlewareConfigProxy}
   */
  apply(middleware: any | any[]): MiddlewareConfigProxy;
}
