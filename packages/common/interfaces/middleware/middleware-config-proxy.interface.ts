import { Type } from '../type.interface.js';
import { RouteInfo } from './middleware-configuration.interface.js';
import { MiddlewareConsumer } from './middleware-consumer.interface.js';

/**
 * @publicApi
 */
export interface MiddlewareConfigProxy {
  /**
   * Routes to exclude from the current middleware.
   *
   * A route given with a `version` is only excluded for the requests for that
   * version: with URI versioning, through the version segment of its path,
   * and with header, media type or custom versioning, by the version the
   * request asks for. A route given without one is excluded for every
   * version with those other types. With URI versioning, it covers the
   * version-neutral route at its path and, with a `defaultVersion`, the
   * routes of the default version, as in `forRoutes()`; give it
   * `version: VERSION_NEUTRAL` to only exclude the version-neutral route.
   *
   * @param {(string | RouteInfo)[]} routes
   * @returns {MiddlewareConfigProxy}
   */
  exclude(...routes: (string | RouteInfo)[]): MiddlewareConfigProxy;

  /**
   * Attaches either routes or controllers to the current middleware.
   * If you pass a controller class, Nest will attach the current middleware to every path
   * defined within it.
   *
   * @param {(string | Type | RouteInfo)[]} routes
   * @returns {MiddlewareConsumer}
   */
  forRoutes(...routes: (string | Type<any> | RouteInfo)[]): MiddlewareConsumer;
}
