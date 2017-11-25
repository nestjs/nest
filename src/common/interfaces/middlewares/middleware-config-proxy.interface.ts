import {RequestMappingMetadata} from '../request-mapping-metadata.interface';

import {MiddlewaresConsumer} from './middlewares-consumer.interface';

export interface MiddlewareConfigProxy {
  /**
   * Passes custom arguments to `resolve()` method of the middleware
   *
   * @param  {} ...data
   * @returns MiddlewareConfigProxy
   */
  with(...data): MiddlewareConfigProxy;

  /**
   * Attaches passed routes / controllers to the processed middleware(s).
   * Single route can be defined as a literal object:
   * ```
   * path: string;
   * method: RequestMethod;
   * ```
   *
   * When you passed Controller class, Nest will attach middleware to every HTTP
   * route handler inside this controller.
   *
   * @param  {} ...routes
   * @returns MiddlewaresConsumer
   */
  forRoutes(...routes): MiddlewaresConsumer;
}