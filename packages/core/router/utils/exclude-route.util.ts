import { RequestMethod } from '@nestjs/common';
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
      return route.pathRegex.exec(addLeadingSlash(path));
    }
    return false;
  });
}
