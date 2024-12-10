import { Type } from '../type.interface';
import { MiddlewareConfigProxy } from './middleware-config-proxy.interface';

/**
 * Interface defining method for applying user defined middleware to routes.
 *
 * @see [MiddlewareConsumer](https://docs.nestjs.com/middleware#middleware-consumer)
 *
 * @publicApi
 */
export interface MiddlewareConsumer {
  /**
   * @param {...(Type | Function)} middleware middleware class/function or array of classes/functions
   * to be attached to the passed routes.
   *
   * @returns {MiddlewareConfigProxy}
   */
  apply(...middleware: (Type<any> | Function)[]): MiddlewareConfigProxy;

  /**
   * Replaces the currently applied middleware with a new (set of) middleware.
   *
   * @param {Type | Function} middlewareToReplace middleware class/function to be replaced.
   * @param {(Type | Function)[]} middlewareReplacement middleware class/function(s) that serve as a replacement for {@link middlewareToReplace}.
   *
   * @returns {MiddlewareConsumer}
   */
  replace(
    middlewareToReplace: Type<any> | Function,
    ...middlewareReplacement: (Type<any> | Function)[]
  ): MiddlewareConsumer;
}
