import { RequestMethod } from '@nestjs/common';
import type { pathToRegexp } from 'path-to-regexp';
import { ExcludeRouteMetadata } from '../interfaces/exclude-route-metadata.interface.js';
import { addLeadingSlash } from '@nestjs/common/internal';

export const isRequestMethodAll = (method: RequestMethod) => {
  return RequestMethod.ALL === method || (method as number) === -1;
};

export function isRouteExcluded(
  excludedRoutes: ExcludeRouteMetadata[],
  path: string,
  requestMethod?: RequestMethod,
) {
  return excludedRoutes.some(route => {
    if (
      isRequestMethodAll(route.requestMethod) ||
      route.requestMethod === requestMethod
    ) {
      return matchesExcludedPath(route, addLeadingSlash(path));
    }
    return false;
  });
}

/**
 * Tells whether the excluded route matches the path: its regular expression
 * (`pathRegex`, unless another one is given) matches it, and none of its
 * parameters is longer than the router serves the route with.
 */
export function matchesExcludedPath(
  route: ExcludeRouteMetadata,
  path: string,
  pathRegex = route.pathRegex,
): boolean {
  if (!route.paramLimit) {
    return pathRegex.test(path);
  }
  const match = pathRegex.exec(path);
  return !!match && !exceedsMaxParamLength(route.paramLimit, match);
}

/**
 * Turns a route path compiled with `pathToRegexp()` into the matcher of an
 * excluded route. With the `maxParamLength` of the router (see
 * `RouteMatchingOptions`), it does not match the paths the router serves
 * with another route because a parameter is too long for this one.
 */
export function toExcludedPathMatcher(
  { regexp, keys }: ReturnType<typeof pathToRegexp>,
  maxParamLength?: number,
): Pick<ExcludeRouteMetadata, 'pathRegex' | 'paramLimit'> {
  // Each key is a capture group, in order, also when optional groups expand
  // into alternatives. Wildcards are not limited
  const groups = keys.flatMap((key, index) =>
    key.type === 'param' ? [index + 1] : [],
  );
  if (maxParamLength === undefined || groups.length === 0) {
    return { pathRegex: regexp };
  }
  return {
    pathRegex: new RegExp(regexp.source, regexp.flags + 'd'),
    paramLimit: { maxLength: maxParamLength, groups },
  };
}

/**
 * Tells whether a parameter of the match is too long for the router to serve
 * the path with the excluded route. The lengths are those of the decoded
 * values, as for the routers. The parameters of one segment (`:from-:to`)
 * are counted together, as the router may divide the decoded segment between
 * them in another way (`%2D` is a `-` once decoded).
 */
function exceedsMaxParamLength(
  { maxLength, groups }: { maxLength: number; groups: number[] },
  match: RegExpExecArray,
): boolean {
  let length = 0;
  let segmentEnd = -1;
  for (const group of groups) {
    const value = match[group];
    if (value === undefined) {
      continue;
    }
    // Without the positions (no "d" flag), all of them count together
    const [start, end] = match.indices?.[group] ?? [];
    if (start !== undefined && start > segmentEnd) {
      const nextSlash = match.input.indexOf('/', end);
      segmentEnd = nextSlash === -1 ? match.input.length : nextSlash;
      length = 0;
    }
    try {
      length += decodeURIComponent(value).length;
    } catch {
      // The routers reject a path that cannot be decoded
      return true;
    }
    if (length > maxLength) {
      return true;
    }
  }
  return false;
}
