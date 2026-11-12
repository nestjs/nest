import type { RequestMethod } from '@nestjs/common';
import type { VersionValue } from '@nestjs/common/internal';

export interface ExcludeRouteMetadata {
  /**
   * Route path.
   */
  path: string;

  /**
   * Regular expression representing the route path.
   */
  pathRegex: RegExp;

  /**
   * Regular expression representing the route path without the optional
   * trailing slash of `pathRegex`. Set for a router that may serve a path
   * ending with "/" with another route than the one of the path without it
   * (see `RouteMatchingOptions.removesTrailingSlash`).
   */
  exactPathRegex?: RegExp;

  /**
   * Set when the router does not serve the route with a parameter longer
   * than `maxLength` (see `RouteMatchingOptions.maxParamLength`): `groups`
   * are the capture groups of the regular expressions that hold a parameter
   * (`:id`), which have the `d` flag, so that a match gives their position.
   */
  paramLimit?: { maxLength: number; groups: number[] };

  /**
   * HTTP request method (e.g., GET, POST).
   */
  requestMethod: RequestMethod;

  /**
   * Version(s) of the route, if any. With URI versioning, it is part of the
   * path as well.
   */
  version?: VersionValue;
}
