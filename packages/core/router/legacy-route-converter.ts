import { Logger } from '@nestjs/common';

const UNSUPPORTED_PATH_MESSAGE = (text: TemplateStringsArray, route: string) =>
  `Unsupported route path: "${route}". In previous versions, the symbols ?, *, and + were used to denote optional or repeating path parameters. The latest version of "path-to-regexp" now requires the use of named parameters. For example, instead of using a route like /users/* to capture all routes starting with "/users", you should use /users/*path. For more details, refer to the migration guide.`;

export class LegacyRouteConverter {
  private static readonly logger = new Logger(LegacyRouteConverter.name);

  /**
   * Convert legacy routes to the new format (syntax).
   * path-to-regexp used by Express>=v5 and @fastify/middie>=v9 no longer support unnamed wildcards.
   * This method attempts to convert the old syntax to the new one, and logs an error if it fails.
   * @param route The route to convert.
   * @returns The converted route, or the original route if it cannot be converted.
   */
  static tryConvert(route: string): string {
    // Normalize path to eliminate additional if statements.
    const routeWithLeadingSlash = route.startsWith('/') ? route : `/${route}`;
    const normalizedRoute = route.endsWith('/')
      ? routeWithLeadingSlash
      : `${routeWithLeadingSlash}/`;

    if (normalizedRoute.endsWith('/(.*)/')) {
      // Skip printing warning for the "all" wildcard.
      if (normalizedRoute !== '/(.*)/') {
        this.printWarning(route);
      }
      return route.replace('(.*)', '{*path}');
    }

    if (normalizedRoute.endsWith('/*/')) {
      // Skip printing warning for the "all" wildcard.
      if (normalizedRoute !== '/*/') {
        this.printWarning(route);
      }
      return route.replace('*', '{*path}');
    }

    if (normalizedRoute.endsWith('/+/')) {
      this.printWarning(route);
      return route.replace('/+', '/*path');
    }

    // When route includes any wildcard segments in the middle.
    if (normalizedRoute.includes('/*/')) {
      this.printWarning(route);
      // Replace each /*/ segment with a named parameter using different name for each segment.
      return route.replaceAll('/*/', (match, offset) => {
        return `/*path${offset}/`;
      });
    }

    return route;
  }

  static printError(route: string): void {
    this.logger.error(UNSUPPORTED_PATH_MESSAGE`${route}`);
  }

  static printWarning(route: string): void {
    this.logger.warn(
      UNSUPPORTED_PATH_MESSAGE`${route}` + ' Attempting to auto-convert...',
    );
  }
}
