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
   * HTTP request method (e.g., GET, POST).
   */
  requestMethod: RequestMethod;

  /**
   * Version(s) of the route, if any. With URI versioning, it is part of the
   * path as well.
   */
  version?: VersionValue;
}
