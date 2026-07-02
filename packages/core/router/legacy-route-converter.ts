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
   * @param options Options object.
   * @returns The converted route, or the original route if it cannot be converted.
   */
  static tryConvert(
    route: string,
    options?: {
      logs?: boolean;
    },
  ): string {
    // Normalize path to eliminate additional if statements.
    const routeWithLeadingSlash = route.startsWith('/') ? route : `/${route}`;
    const normalizedRoute = route.endsWith('/')
      ? routeWithLeadingSlash
      : `${routeWithLeadingSlash}/`;

    const loggingEnabled = options?.logs ?? true;
    const printWarning = loggingEnabled
      ? this.printWarning.bind(this)
      : () => {};

    if (normalizedRoute.endsWith('/(.*)/')) {
      const convertedRoute = route.replace('(.*)', '{*path}');
      // Skip printing warning for the "all" wildcard.
      if (normalizedRoute !== '/(.*)/') {
        printWarning(route, convertedRoute);
      }
      return convertedRoute;
    }

    if (normalizedRoute.endsWith('/*/')) {
      const convertedRoute = route.replace('*', '{*path}');
      // Skip printing warning for the "all" wildcard.
      if (normalizedRoute !== '/*/') {
        printWarning(route, convertedRoute);
      }
      return convertedRoute;
    }

    if (normalizedRoute.endsWith('/+/')) {
      const convertedRoute = route.replace('/+', '/*path');
      printWarning(route, convertedRoute);
      return convertedRoute;
    }

    // When route includes any wildcard segments in the middle.
    if (normalizedRoute.includes('/*/')) {
      // Replace each /*/ segment with a named parameter using different name for each segment.
      const convertedRoute = route.replaceAll('/*/', (match, offset) => {
        return `/*path${offset}/`;
      });
      printWarning(route, convertedRoute);
      return convertedRoute;
    }

    return route;
  }

  static printError(route: string): void {
    this.logger.error(UNSUPPORTED_PATH_MESSAGE`${route}`);
  }

  static printWarning(route: string, convertedRoute?: string): void {
    // Surface the auto-converted result so users can map the flagged path to a
    // concrete fix, instead of only seeing the (often prefixed) offending path.
    const autoConvertMessage = convertedRoute
      ? ` Attempting to auto-convert to "${convertedRoute}"...`
      : ' Attempting to auto-convert...';
    this.logger.warn(UNSUPPORTED_PATH_MESSAGE`${route}` + autoConvertMessage);
  }
}
